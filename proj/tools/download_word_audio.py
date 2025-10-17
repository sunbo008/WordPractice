#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量下载单词音频脚本
扫描 proj/words 目录下的所有 JSON 文件，通过有道 API 下载单词音频到 proj/audio 目录
"""

import os
import json
import time
import requests
import re
from pathlib import Path
from urllib.parse import quote
from typing import Set, List, Dict, Any


class WordAudioDownloader:
    """单词音频下载器"""
    
    # 单词匹配正则表达式（复用 scan_words.py 的逻辑）
    WORD_PATTERN = re.compile(r"[A-Za-z]+(?:[-'][A-Za-z]+)*")
    
    def __init__(self):
        # 获取脚本所在目录的父目录（proj目录）
        self.script_dir = Path(__file__).parent
        self.proj_dir = self.script_dir.parent
        self.words_dir = self.proj_dir / 'words'
        self.audio_dir = self.proj_dir / 'audio'
        
        # 有道 TTS API
        self.api_url = "https://dict.youdao.com/dictvoice?audio={word}&type=1"
        
        # 下载配置
        self.max_retries = 3
        self.retry_delay = 1  # 秒
        self.request_delay = 0.3  # 请求间隔，避免频繁请求
        
        # 统计信息
        self.stats = {
            'total_words': 0,
            'existing_files': 0,
            'downloaded': 0,
            'failed': 0,
            'skipped': 0
        }
        
    def scan_json_files(self) -> List[Path]:
        """递归扫描所有 JSON 文件"""
        json_files = []
        for json_file in self.words_dir.rglob('*.json'):
            # 跳过配置文件
            if json_file.name in ['config.json', 'manifest.json']:
                continue
            json_files.append(json_file)
        return json_files
    
    def extract_words_from_json_data(self, data: Any) -> Set[str]:
        """递归地从 JSON 数据中收集所有词汇项（复用 scan_words.py 的逻辑）
        
        规则：
        - 如果对象包含 'word' 键且值为字符串，则收集该值
        - 递归遍历列表
        - 忽略其他所有字符串值（ids、names、filenames、descriptions、categories 等）
        - 过滤掉单字母标记
        """
        collected: Set[str] = set()
        
        if data is None:
            return collected
        
        if isinstance(data, dict):
            # 如果这个字典直接定义了一个单词项
            if "word" in data and isinstance(data["word"], str):
                w = data["word"].strip().lower()
                if len(w) >= 2 and self.WORD_PATTERN.fullmatch(w.replace("'", "'") if True else w):
                    collected.add(w)
            # 递归到其他嵌套结构
            for value in data.values():
                if isinstance(value, (dict, list)):
                    collected |= self.extract_words_from_json_data(value)
            return collected
        
        if isinstance(data, list):
            for item in data:
                collected |= self.extract_words_from_json_data(item)
            return collected
        
        # 忽略没有键上下文的原始字符串
        return collected
    
    def extract_words_from_json(self, json_file: Path) -> Set[str]:
        """从 JSON 文件中提取单词列表（使用 scan_words.py 的递归扫描逻辑）"""
        words = set()
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # 使用递归方法提取所有单词
            words = self.extract_words_from_json_data(data)
        except Exception as e:
            print(f"  [警告] 解析文件失败 {json_file.name}: {e}")
        
        return words
    
    def collect_all_words(self) -> Set[str]:
        """收集所有单词"""
        print("[扫描] 扫描单词文件...")
        json_files = self.scan_json_files()
        print(f"   找到 {len(json_files)} 个 JSON 文件")
        
        all_words = set()
        for json_file in json_files:
            words = self.extract_words_from_json(json_file)
            all_words.update(words)
        
        print(f"   共收集到 {len(all_words)} 个唯一单词")
        return all_words
    
    def get_existing_audio_files(self) -> Set[str]:
        """获取已存在的音频文件"""
        existing_words = set()
        
        if not self.audio_dir.exists():
            self.audio_dir.mkdir(parents=True, exist_ok=True)
            return existing_words
        
        for audio_file in self.audio_dir.glob('*_youdao.mp3'):
            # 从文件名中提取单词（去掉 _youdao.mp3 后缀）
            word = audio_file.stem.replace('_youdao', '')
            existing_words.add(word.lower())
        
        return existing_words
    
    def download_audio(self, word: str) -> bool:
        """下载单个单词的音频"""
        filename = f"{word}_youdao.mp3"
        filepath = self.audio_dir / filename
        
        # 构建 API URL
        url = self.api_url.format(word=quote(word))
        
        # 重试机制
        for attempt in range(self.max_retries):
            try:
                response = requests.get(url, timeout=10)
                
                if response.status_code == 200:
                    # 检查是否是有效的音频文件（至少有一些字节）
                    if len(response.content) < 100:
                        raise Exception("音频文件太小，可能无效")
                    
                    # 保存音频文件
                    with open(filepath, 'wb') as f:
                        f.write(response.content)
                    
                    return True
                else:
                    raise Exception(f"HTTP {response.status_code}")
                    
            except Exception as e:
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delay)
                else:
                    print(f"  [错误] 下载失败: {word} - {e}")
                    return False
        
        return False
    
    def download_missing_audio(self, words_to_download: Set[str]):
        """批量下载缺失的音频文件"""
        total = len(words_to_download)
        
        if total == 0:
            print("[完成] 所有单词音频已存在，无需下载")
            return
        
        print(f"\n[下载] 开始下载 {total} 个单词的音频...\n")
        
        words_list = sorted(words_to_download)
        
        for idx, word in enumerate(words_list, 1):
            print(f"[{idx}/{total}] 下载: {word}", end=' ')
            
            if self.download_audio(word):
                print("[OK]")
                self.stats['downloaded'] += 1
            else:
                print("[FAIL]")
                self.stats['failed'] += 1
            
            # 请求间隔延迟
            if idx < total:
                time.sleep(self.request_delay)
    
    def print_statistics(self):
        """打印下载统计信息"""
        print("\n" + "=" * 50)
        print("[统计] 下载统计")
        print("=" * 50)
        print(f"总单词数:     {self.stats['total_words']}")
        print(f"已存在文件:   {self.stats['existing_files']}")
        print(f"成功下载:     {self.stats['downloaded']}")
        print(f"下载失败:     {self.stats['failed']}")
        print("=" * 50)
        
        if self.stats['failed'] > 0:
            print("[警告] 部分文件下载失败，请稍后重新运行脚本重试")
        elif self.stats['downloaded'] > 0:
            print("[完成] 所有音频文件下载完成！")
        else:
            print("[完成] 所有音频文件已是最新状态！")
    
    def run(self):
        """运行下载流程"""
        print("\n" + "=" * 50)
        print("[音频下载] 单词音频批量下载工具")
        print("=" * 50 + "\n")
        
        # 1. 收集所有单词
        all_words = self.collect_all_words()
        self.stats['total_words'] = len(all_words)
        
        # 2. 检查已存在的音频文件
        print("\n[检查] 检查已存在的音频文件...")
        existing_words = self.get_existing_audio_files()
        self.stats['existing_files'] = len(existing_words)
        print(f"   已存在 {len(existing_words)} 个音频文件")
        
        # 3. 计算需要下载的单词
        words_to_download = all_words - existing_words
        
        # 4. 下载缺失的音频
        self.download_missing_audio(words_to_download)
        
        # 5. 打印统计信息
        self.print_statistics()


def main():
    """主函数"""
    downloader = WordAudioDownloader()
    
    try:
        downloader.run()
    except KeyboardInterrupt:
        print("\n\n[中断] 用户中断下载")
        downloader.print_statistics()
    except Exception as e:
        print(f"\n\n[错误] 发生错误: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()

