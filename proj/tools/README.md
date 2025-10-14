# 单词处理工具使用指南

## 📋 目录

1. [工具简介](#-简介)
2. [scan_words.py 使用说明](#-工具一scan_wordspy单词扫描工具)
3. [generate_word_images.py 使用说明](#-工具二generate_word_imagespy图片生成工具)
   - [智能跳过机制](#-智能跳过机制) ⭐ 重要
4. [完整工作流程](#-完整工作流程示例)
5. [图片生成工具详细说明](#-图片生成工具详细说明)
   - [配置管理](#️-配置管理)
   - [图像生成参数详解](#-图像生成参数详解)
   - [命令行参数完整列表](#-命令行参数完整列表)
6. [使用场景示例](#-使用场景示例)
7. [运行日志](#-运行日志)
8. [故障排查](#-故障排查)
9. [最佳实践](#-最佳实践)
   - [智能跳过最佳实践](#35-智能跳过最佳实践) ⭐ 推荐
10. [附录](#-附录)
    - [智能跳过逻辑详解](#e-智能跳过逻辑详解)
11. [相关资源](#-相关资源)
12. [文件结构](#️-文件结构)
13. [更新日志](#-更新日志)

---

## 📖 简介

本目录包含两个核心工具，用于英语单词的扫描和配图生成：

1. **`scan_words.py`** - 扫描 JSON 文件并提取单词列表
2. **`generate_word_images.py`** - 为单词生成高质量配图

### 工作流程

```
JSON 单词文件 → scan_words.py → words.csv → generate_word_images.py → 图片
```

---

## 🔍 工具一：scan_words.py（单词扫描工具）

### 功能简介

`scan_words.py` 用于扫描指定目录下的所有 JSON 文件，提取其中的英语单词，并生成 CSV 格式的单词列表。

### 主要特性

- ✅ 递归扫描目录中的所有 JSON 文件
- ✅ 智能提取 JSON 中的 `word` 字段
- ✅ 按文件组织单词列表
- ✅ 自动去重和排序
- ✅ 生成统计摘要
- ✅ 支持自定义输入输出路径

### 快速开始

**基础使用（使用默认路径）**

```bash
cd proj/tools
python3 scan_words.py
```

**自定义路径**

```bash
python3 scan_words.py --input ../words --output ../words/words.csv
# 或使用短参数
python3 scan_words.py -i ../words -o ../words/words.csv
```

### 输入要求

JSON 文件应包含 `word` 字段，例如：

```json
{
  "unit": "Unit 1",
  "vocabulary": [
    { "word": "apple", "meaning": "苹果" },
    { "word": "banana", "meaning": "香蕉" }
  ]
}
```

### 输出格式

生成的 `words.csv` 文件格式：

```csv
file,count,words
unit1.json,10,apple banana cat dog elephant
unit2.json,8,fish grape house ice juice
__summary__,files,2
__summary__,total_words,18
```

### 命令行参数

| 参数       | 短参数 | 类型 | 默认值               | 说明                     |
| ---------- | ------ | ---- | -------------------- | ------------------------ |
| `--input`  | `-i`   | Path | `../words`           | 包含 JSON 文件的输入目录 |
| `--output` | `-o`   | Path | `../words/words.csv` | 输出的 CSV 文件路径      |

### 使用示例

**示例 1：扫描默认目录**

```bash
python3 scan_words.py
```

输出：

```
[OK] Scanned JSON files: 85
[OK] Total words (per-file sum): 1245
[OK] Wrote to: /path/to/proj/words/words.csv
```

**示例 2：扫描指定目录**

```bash
python3 scan_words.py --input /path/to/custom/words --output /path/to/output.csv
```

**示例 3：查看生成的 CSV 文件**

```bash
# 查看前 10 行
head -n 10 ../words/words.csv

# 查看摘要信息
tail -n 2 ../words/words.csv

# 统计单词数量
grep -v "^__summary__" ../words/words.csv | grep -v "^file," | wc -l
```

### 提取规则

1. **优先提取 JSON 结构**

   - 递归查找所有包含 `word` 键的对象
   - 只提取 `word` 字段的值，忽略其他字段

2. **过滤规则**

   - 单词长度必须 ≥ 2 个字符
   - 只保留字母、连字符和撇号
   - 自动转换为小写

3. **容错处理**
   - JSON 解析失败时，自动回退到文本提取模式
   - 跳过非 JSON 文件
   - 自动跳过输出文件本身

### 常见问题

**Q: 为什么某些单词没有被提取？**

A: 确保 JSON 中使用的是 `word` 字段。示例：

```json
✅ 正确：{ "word": "apple" }
❌ 错误：{ "text": "apple" }
❌ 错误：{ "vocabulary": "apple" }
```

**Q: 如何查看提取了多少个单词？**

```bash
# 方法 1：查看控制台输出
python3 scan_words.py

# 方法 2：查看 CSV 最后一行
tail -n 1 ../words/words.csv
```

**Q: 输出的单词顺序是什么？**

A:

- 文件按文件名字母顺序排序
- 每个文件中的单词按字母顺序排序

---

## 🎨 工具二：generate_word_images.py（图片生成工具）

### 功能简介

`generate_word_images.py` 是一个用于批量生成英语单词配图的工具，通过调用 SiliconFlow（硅基流动）的图像生成 API，为单词创建高质量的插图。

### 主要特性

- ✅ 支持从 CSV 文件批量读取单词（配合 `scan_words.py`）
- ✅ 支持命令行直接指定单词
- ✅ 灵活的配置管理（JSON + 命令行参数）
- ✅ 自动失败重试机制
- ✅ 详细的运行日志记录
- ✅ 支持自定义图像生成参数
- ✅ **智能跳过已存在的图片**（避免重复生成）

### 💡 智能跳过机制

工具采用**智能跳过已存在图片**的机制，节省 API 调用成本和时间：

**默认行为（跳过已存在）**：

```bash
# 只生成不存在的图片，跳过已有的
python3 generate_word_images.py --csv ../words/words.csv --limit 100
```

**工作原理**：

1. 对于每个单词，工具会检查输出目录中是否存在 `{word}.jpg`
2. 如果文件已存在：**自动跳过**，不消耗 API 调用
3. 如果文件不存在：调用 API 生成新图片
4. 跳过的单词**不计入** `--limit` 限制

**强制重新生成**：

```bash
# 使用 --force 参数强制重新生成所有图片
python3 generate_word_images.py --word apple --force
python3 generate_word_images.py --csv ../words/words.csv --limit 100 --force
```

**实际示例**：

假设 `words.csv` 包含 200 个单词，其中 50 个已有图片：

```bash
# 情况 1：不使用 --force（默认）
python3 generate_word_images.py --csv ../words/words.csv --limit 100
# 结果：跳过 50 个已有图片，生成 100 个新图片（共处理 150 个单词）

# 情况 2：使用 --force
python3 generate_word_images.py --csv ../words/words.csv --limit 100 --force
# 结果：强制重新生成前 100 个单词，无论是否已存在
```

**使用建议**：

- ✅ **日常使用**：不加 `--force`，让工具自动跳过已有图片
- ✅ **增量生成**：添加新单词后，直接运行即可只生成新单词
- ⚠️ **重新生成**：只在需要更新图片质量或风格时使用 `--force`

---

## 🔄 完整工作流程示例

### 从 JSON 到图片的完整流程

```bash
# 步骤 1：扫描 JSON 文件提取单词
cd proj/tools
python3 scan_words.py

# 步骤 2：查看提取的单词
head -n 20 ../words/words.csv

# 步骤 3：配置 API Key（仅首次需要）
python3 generate_word_images.py --set-api-key sk-your-api-key

# 步骤 4：批量生成图片
python3 generate_word_images.py --csv ../words/words.csv --limit 50

# 步骤 5：查看生成结果
ls -lh ../images/generated/
```

### 快速测试流程

```bash
# 1. 扫描单词
python3 scan_words.py

# 2. 生成单个单词测试
python3 generate_word_images.py --word apple

# 3. 检查生成的图片
open ../images/generated/apple.jpg  # macOS
# 或
xdg-open ../images/generated/apple.jpg  # Linux
```

---

## 🚀 图片生成工具详细说明

### 1. 安装依赖

```bash
pip install pillow
```

### 2. 配置 API Key

三种方式任选其一：

**方式一：保存到配置文件（推荐）**

```bash
python3 generate_word_images.py --set-api-key sk-your-api-key-here
```

**方式二：环境变量**

```bash
export SILICONFLOW_API_KEY=sk-your-api-key-here
```

**方式三：命令行参数**

```bash
python3 generate_word_images.py --api-key sk-your-api-key-here --word apple
```

### 3. 生成图片

**生成单个单词**

```bash
python3 generate_word_images.py --word apple
```

**生成多个单词**

```bash
python3 generate_word_images.py --word apple --word banana --word cat
# 或者使用分号/逗号分隔
python3 generate_word_images.py --words "apple;banana;cat"
```

**从 CSV 文件批量生成**

```bash
python3 generate_word_images.py --csv ../words/words.csv --limit 50
```

---

## ⚙️ 配置管理

### 配置文件位置

配置文件：`proj/tools/generate_word_images.json`

### 配置项说明

| 配置项                | 类型   | 默认值     | 说明                                    |
| --------------------- | ------ | ---------- | --------------------------------------- |
| `apiKey`              | string | -          | SiliconFlow API 密钥                    |
| `model`               | string | `"kolors"` | 图像生成模型                            |
| `promptConstraints`   | string | -          | 提示词约束模板                          |
| `guidance_scale`      | float  | `7.5`      | 引导强度（cfg），控制对提示词的遵循程度 |
| `num_inference_steps` | int    | `20`       | 推理步数，影响生成质量和速度            |
| `negative_prompt`     | string | `""`       | 负面提示词，排除不想要的特征            |

### 永久设置配置

```bash
# 设置模型
python3 generate_word_images.py --set-model "Qwen/Qwen-Image"

# 设置提示词模板
python3 generate_word_images.py --set-prompt "Cartoon style, kid-friendly. Represent {word}."

# 设置引导强度（cfg）
python3 generate_word_images.py --set-guidance-scale 7.5

# 设置推理步数
python3 generate_word_images.py --set-inference-steps 30

# 设置负面提示词
python3 generate_word_images.py --set-negative-prompt "blurry, low quality, watermark"
```

### 查看当前配置

```bash
cat generate_word_images.json
# 或
python3 -c "import json; print(json.dumps(json.load(open('generate_word_images.json')), indent=2))"
```

---

## 🎨 图像生成参数详解

### 1. Guidance Scale (引导强度)

**参数名**: `guidance_scale` 或 `--guidance-scale`

**作用**: 控制 AI 对提示词的遵循程度

- **低值 (1-5)**: 更自由、更有创意，但可能偏离提示词
- **中值 (5-10)**: 平衡创意与准确性 ⭐ **推荐范围**
- **高值 (10-20)**: 严格遵循提示词，但可能过度饱和

**示例**:

```bash
# 使用低引导强度（更自由）
python3 generate_word_images.py --word apple --guidance-scale 4.0

# 使用高引导强度（更精确）
python3 generate_word_images.py --word apple --guidance-scale 15.0
```

**当前配置**: `15.0` （用户已设置为较高值，确保图片严格符合要求）

### 2. Inference Steps (推理步数)

**参数名**: `num_inference_steps` 或 `--inference-steps`

**作用**: 控制图像生成的迭代次数，影响质量和速度

- **低值 (10-20)**: 生成快，适合快速预览
- **中值 (20-50)**: 平衡质量与速度 ⭐ **推荐范围**
- **高值 (50-100)**: 高质量，但耗时较长

**示例**:

```bash
# 快速生成
python3 generate_word_images.py --word apple --inference-steps 15

# 高质量生成
python3 generate_word_images.py --word apple --inference-steps 50
```

**当前配置**: `20`

### 3. Negative Prompt (负面提示词)

**参数名**: `negative_prompt` 或 `--negative-prompt`

**作用**: 描述不想在图片中出现的内容

**常用负面提示词**:

```
blurry, low quality, distorted, deformed,
watermark, text, letters, numbers,
ugly, bad anatomy, extra limbs,
duplicate, cropped, out of frame
```

**示例**:

```bash
# 排除模糊和文字
python3 generate_word_images.py --word apple \
  --negative-prompt "blurry, text, watermark"

# 排除多种不良特征
python3 generate_word_images.py --word cat \
  --negative-prompt "ugly, distorted, deformed, bad anatomy"
```

**当前配置**:

```
blurry, low quality, distorted, deformed,
watermark, text, letters, numbers,
ugly, bad anatomy
```

---

## 📝 命令行参数完整列表

### 基本参数

| 参数           | 类型   | 默认值                      | 说明                     |
| -------------- | ------ | --------------------------- | ------------------------ |
| `--csv`        | Path   | `../words/words.csv`        | CSV 文件路径             |
| `--output-dir` | Path   | `../images/generated`       | 图片输出目录             |
| `--log`        | Path   | `generate_word_images.json` | JSON 配置文件路径        |
| `--log-file`   | Path   | `generate_word_images.log`  | 运行日志文件路径         |
| `--size`       | string | `"300x300"`                 | 图片尺寸                 |
| `--limit`      | int    | `20`                        | 单次运行最多处理的单词数 |
| `--delay`      | float  | `1.0`                       | API 调用间隔（秒）       |
| `--retry`      | int    | `2`                         | 失败重试次数             |
| `--force`      | flag   | `false`                     | 强制重新生成已存在的图片 |

### API 相关参数

| 参数            | 类型   | 默认值                       | 说明                    |
| --------------- | ------ | ---------------------------- | ----------------------- |
| `--api-key`     | string | -                            | API 密钥（临时使用）    |
| `--set-api-key` | string | -                            | 保存 API 密钥到配置文件 |
| `--base-url`    | string | `https://api.siliconflow.cn` | API 基础 URL            |
| `--endpoint`    | string | `/v1/images/generations`     | API 端点路径            |

### 模型和提示词参数

| 参数           | 类型   | 默认值 | 说明                     |
| -------------- | ------ | ------ | ------------------------ |
| `--model`      | string | -      | 模型 ID（临时覆盖）      |
| `--set-model`  | string | -      | 保存模型到配置文件       |
| `--prompt`     | string | -      | 提示词模板（临时覆盖）   |
| `--set-prompt` | string | -      | 保存提示词模板到配置文件 |

### 生成参数

| 参数                    | 类型   | 默认值 | 说明                     |
| ----------------------- | ------ | ------ | ------------------------ |
| `--guidance-scale`      | float  | -      | 引导强度（临时覆盖）     |
| `--set-guidance-scale`  | float  | -      | 保存引导强度到配置文件   |
| `--inference-steps`     | int    | -      | 推理步数（临时覆盖）     |
| `--set-inference-steps` | int    | -      | 保存推理步数到配置文件   |
| `--negative-prompt`     | string | -      | 负面提示词（临时覆盖）   |
| `--set-negative-prompt` | string | -      | 保存负面提示词到配置文件 |

### 单词输入参数

| 参数      | 类型   | 默认值 | 说明                           |
| --------- | ------ | ------ | ------------------------------ |
| `--word`  | string | -      | 指定单词（可重复多次）         |
| `--words` | string | -      | 批量指定单词（分号或逗号分隔） |

---

## 💡 使用场景示例

### 场景 0：完整流程（首次使用）

```bash
# 步骤 1：扫描所有 JSON 文件
cd proj/tools
python3 scan_words.py

# 查看扫描结果
echo "扫描完成，单词数量："
tail -n 1 ../words/words.csv

# 步骤 2：配置图片生成工具
python3 generate_word_images.py --set-api-key sk-your-api-key
python3 generate_word_images.py --set-model "Qwen/Qwen-Image"
python3 generate_word_images.py --set-guidance-scale 15.0
python3 generate_word_images.py --set-inference-steps 20

# 步骤 3：测试生成单个单词
python3 generate_word_images.py --word apple

# 步骤 4：批量生成图片（分批次）
python3 generate_word_images.py --csv ../words/words.csv --limit 100 --delay 1.5

# 步骤 5：查看生成结果
ls -lh ../images/generated/ | head -n 20
```

### 场景 1：初次使用配置

```bash
# 1. 设置 API Key
python3 generate_word_images.py --set-api-key sk-your-api-key

# 2. 设置模型
python3 generate_word_images.py --set-model "Qwen/Qwen-Image"

# 3. 设置提示词模板
python3 generate_word_images.py --set-prompt \
  "realist style, kid-friendly, plain background. Represent {word}."

# 4. 设置生成参数
python3 generate_word_images.py --set-guidance-scale 7.5
python3 generate_word_images.py --set-inference-steps 20
python3 generate_word_images.py --set-negative-prompt \
  "blurry, low quality, watermark, text"
```

### 场景 2：批量生成单词图片

```bash
# 从 CSV 文件生成 100 个单词的图片
python3 generate_word_images.py \
  --csv ../words/words.csv \
  --limit 100 \
  --output-dir ../images/generated \
  --delay 1.5
```

### 场景 3：测试不同参数效果

```bash
# 低引导强度（更自由）
python3 generate_word_images.py --word apple \
  --guidance-scale 4.0 --inference-steps 20 \
  --output-dir ../images/test_low_cfg

# 高引导强度（更精确）
python3 generate_word_images.py --word apple \
  --guidance-scale 15.0 --inference-steps 20 \
  --output-dir ../images/test_high_cfg

# 高质量生成（更多步数）
python3 generate_word_images.py --word apple \
  --guidance-scale 7.5 --inference-steps 50 \
  --output-dir ../images/test_high_steps
```

### 场景 4：强制重新生成已有图片

```bash
# 使用 --force 参数强制重新生成
python3 generate_word_images.py \
  --words "apple;banana;cat" \
  --force
```

### 场景 5：快速生成特定单词列表

```bash
# 生成水果类单词
python3 generate_word_images.py \
  --words "apple,banana,orange,grape,watermelon" \
  --size 512x512

# 生成动物类单词
python3 generate_word_images.py \
  --word cat --word dog --word bird --word fish \
  --guidance-scale 8.0 \
  --inference-steps 30
```

### 场景 6：自定义提示词风格

```bash
# 卡通风格
python3 generate_word_images.py --word apple \
  --prompt "Cartoon style, colorful, child-friendly. Represent {word}."

# 写实风格
python3 generate_word_images.py --word apple \
  --prompt "Photorealistic, high quality, professional photography. Represent {word}."

# 简约风格
python3 generate_word_images.py --word apple \
  --prompt "Minimalist, simple, clean design. Represent {word}."
```

### 场景 7：重新扫描单词后更新图片

```bash
# 1. 添加新的 JSON 文件到 proj/words/ 目录
# 2. 重新扫描
python3 scan_words.py

# 3. 只生成新增的单词（跳过已存在的图片）
python3 generate_word_images.py --csv ../words/words.csv --limit 200

# 4. 如果要强制重新生成所有图片
python3 generate_word_images.py --csv ../words/words.csv --limit 200 --force
```

### 场景 8：从特定 JSON 文件提取单词并生成图片

```bash
# 1. 创建临时目录只包含特定文件
mkdir -p /tmp/selected_words
cp ../words/unit1.json /tmp/selected_words/
cp ../words/unit2.json /tmp/selected_words/

# 2. 扫描这些文件
python3 scan_words.py --input /tmp/selected_words --output /tmp/selected_words.csv

# 3. 为这些单词生成图片
python3 generate_word_images.py --csv /tmp/selected_words.csv --limit 999
```

### 场景 9：数据分析和统计

```bash
# 统计每个文件的单词数
python3 scan_words.py
cat ../words/words.csv | grep -v "^__summary__" | grep -v "^file," | \
  awk -F',' '{print $1, $2}' | sort -k2 -rn | head -n 10

# 查找包含特定单词的文件
grep -i "apple" ../words/words.csv

# 统计总单词数
tail -n 1 ../words/words.csv

# 提取所有单词列表（去重）
cat ../words/words.csv | grep -v "^__summary__" | grep -v "^file," | \
  cut -d',' -f3 | tr ' ' '\n' | sort -u > all_words.txt
```

---

## 📊 运行日志

### 日志文件位置

运行日志：`proj/tools/generate_word_images.log`

### 日志格式

每行一个 JSON 对象，包含：

```json
{
  "ts": 1760422746.453252,
  "word": "apple",
  "status": "ok",
  "image_path": "/path/to/apple.jpg",
  "model": "Qwen/Qwen-Image",
  "size": "300x300"
}
```

### 查看日志

```bash
# 查看最近 10 条日志
tail -n 10 generate_word_images.log

# 查看所有成功的记录
grep '"status": "ok"' generate_word_images.log

# 查看所有失败的记录
grep '"status": "error"' generate_word_images.log

# 统计生成数量
wc -l generate_word_images.log
```

---

## 🐛 故障排查

### 问题 1：API Key 错误

**错误信息**:

```
[ERROR] Missing API key. Provide via --api-key, env SILICONFLOW_API_KEY, or set in log JSON with --set-api-key.
```

**解决方法**:

```bash
python3 generate_word_images.py --set-api-key sk-your-valid-key
```

### 问题 2：API 调用失败

**错误信息**:

```
[ERROR] apple: HTTP 401: Unauthorized
```

**解决方法**:

1. 检查 API Key 是否正确
2. 检查 API Key 是否过期
3. 检查网络连接

### 问题 3：图片生成速度慢

**原因**: `inference_steps` 设置过高

**解决方法**:

```bash
# 降低推理步数以提高速度
python3 generate_word_images.py --set-inference-steps 15
```

### 问题 4：图片质量不佳

**可能原因**:

- `guidance_scale` 过低
- `inference_steps` 过低
- 提示词不够具体

**解决方法**:

```bash
# 提高生成参数
python3 generate_word_images.py --word apple \
  --guidance-scale 10.0 \
  --inference-steps 40 \
  --negative-prompt "blurry, low quality, distorted"
```

### 问题 5：图片包含不想要的元素（如文字）

**解决方法**:

```bash
# 增强负面提示词
python3 generate_word_images.py --set-negative-prompt \
  "text, letters, numbers, watermark, caption, subtitle, words, characters"
```

### 问题 6：工具没有生成任何图片

**可能原因**:

1. 所有单词的图片都已存在
2. 没有使用 `--force` 参数

**检查方法**:

```bash
# 检查已有图片数量
ls ../images/generated/*.jpg | wc -l

# 检查 CSV 中的单词数量
grep -v "^__summary__" ../words/words.csv | grep -v "^file," | wc -l

# 查看详细输出
python3 generate_word_images.py --csv ../words/words.csv --limit 10
```

**解决方法**:

```bash
# 方法 1：使用 --force 强制重新生成
python3 generate_word_images.py --csv ../words/words.csv --limit 10 --force

# 方法 2：删除已有图片后重新生成
rm ../images/generated/apple.jpg
python3 generate_word_images.py --word apple

# 方法 3：生成新单词
python3 generate_word_images.py --words "newword1;newword2"
```

### 问题 7：如何查看跳过了哪些单词

**解决方法**:

工具默认会跳过已存在的图片，但不会输出跳过信息。可以通过以下方式检查：

```bash
# 方法 1：对比 CSV 和生成的图片
# 查看 CSV 中的所有单词
grep -v "^__summary__" ../words/words.csv | cut -d',' -f3 | tr ' ' '\n' | sort > /tmp/words_in_csv.txt

# 查看已生成的图片
ls ../images/generated/*.jpg | xargs -n1 basename | sed 's/.jpg$//' | sort > /tmp/words_generated.txt

# 找出缺失的单词
comm -23 /tmp/words_in_csv.txt /tmp/words_generated.txt

# 方法 2：使用 --force 查看会生成多少个
python3 generate_word_images.py --csv ../words/words.csv --limit 999 --force
# 注意：这会实际生成，建议先测试小数量
```

---

## 🎯 最佳实践

### 1. 参数推荐值

**儿童教育用途**（当前配置）:

```bash
--guidance-scale 15.0        # 高精确度
--inference-steps 20         # 平衡质量与速度
--negative-prompt "blurry, low quality, distorted, deformed, watermark, text, letters, numbers, ugly, bad anatomy"
```

**快速预览**:

```bash
--guidance-scale 7.5
--inference-steps 15
```

**高质量输出**:

```bash
--guidance-scale 10.0
--inference-steps 50
```

### 2. 提示词编写技巧

**好的提示词**:

- ✅ 具体描述风格：`realist style, kid-friendly`
- ✅ 说明背景：`plain background, clear composition`
- ✅ 明确主体：`Represent the English word {word}`
- ✅ 排除不需要的：使用 `negative_prompt`

**不好的提示词**:

- ❌ 过于简单：`{word}`
- ❌ 模糊不清：`nice picture of {word}`
- ❌ 包含冲突描述：`realistic cartoon style`

### 3. 批量生成建议

```bash
# 分批次生成，避免一次性生成过多
for i in {1..10}; do
  python3 generate_word_images.py \
    --csv ../words/words.csv \
    --limit 50 \
    --delay 2.0
  echo "Batch $i completed. Waiting 60 seconds..."
  sleep 60
done
```

**注意**：由于工具会自动跳过已存在的图片，多次运行相同命令是安全的，不会重复生成。

### 3.5. 智能跳过最佳实践

**✅ 推荐做法**：

```bash
# 1. 首次生成：生成前 100 个单词
python3 generate_word_images.py --csv ../words/words.csv --limit 100

# 2. 后续运行：继续生成剩余单词（自动跳过已有的 100 个）
python3 generate_word_images.py --csv ../words/words.csv --limit 200

# 3. 添加新单词后：直接运行，只生成新单词
python3 scan_words.py  # 重新扫描
python3 generate_word_images.py --csv ../words/words.csv --limit 999
```

**❌ 避免的做法**：

```bash
# 不推荐：每次都删除已有图片
rm -rf ../images/generated/*  # 浪费 API 额度
python3 generate_word_images.py --csv ../words/words.csv --limit 100

# 不推荐：不必要的 --force
python3 generate_word_images.py --csv ../words/words.csv --limit 100 --force  # 重复生成
```

**💡 实用技巧**：

```bash
# 技巧 1：查看还有多少单词未生成
total_words=$(grep -v "^__summary__" ../words/words.csv | cut -d',' -f3 | tr ' ' '\n' | wc -l)
generated=$(ls ../images/generated/*.jpg 2>/dev/null | wc -l)
echo "总单词数: $total_words"
echo "已生成: $generated"
echo "待生成: $((total_words - generated))"

# 技巧 2：只生成缺失的图片
python3 generate_word_images.py --csv ../words/words.csv --limit 999

# 技巧 3：重新生成指定单词
rm ../images/generated/apple.jpg ../images/generated/banana.jpg
python3 generate_word_images.py --words "apple;banana"
```

### 4. 测试流程

```bash
# 1. 先用单个单词测试参数
python3 generate_word_images.py --word test \
  --guidance-scale 7.5 --inference-steps 20

# 2. 确认效果满意后，保存到配置
python3 generate_word_images.py --set-guidance-scale 7.5
python3 generate_word_images.py --set-inference-steps 20

# 3. 批量生成
python3 generate_word_images.py --csv ../words/words.csv --limit 100
```

---

## 📚 附录

### A. CSV 文件格式

期望的 CSV 格式（由 `scan_words.py` 生成）:

```csv
file,count,words
unit1.json,10,apple banana orange grape watermelon
unit2.json,8,cat dog bird fish rabbit
__summary__,18,
```

### B. 支持的图片尺寸

常用尺寸：

- `256x256` - 小图
- `300x300` - 默认
- `512x512` - 中图
- `1024x1024` - 大图

### C. 支持的模型

SiliconFlow 支持的图像生成模型（示例）:

- `Qwen/Qwen-Image` - 通义千问图像模型
- `kolors` - Kolors 模型
- `stabilityai/stable-diffusion-xl-base-1.0` - Stable Diffusion XL

### D. API 优先级

参数的优先级（从高到低）:

1. 命令行参数（`--guidance-scale 7.5`）
2. 环境变量（`SILICONFLOW_API_KEY`）
3. JSON 配置文件（`generate_word_images.json`）
4. 代码中的默认值

### E. 智能跳过逻辑详解

**跳过判断逻辑**：

```python
# 伪代码
for word in words_list:
    image_path = output_dir / f"{word}.jpg"

    if not force and image_path.exists():
        # 跳过已存在的图片
        continue  # 不计入 processed 计数

    # 生成图片
    generate_image(word)
    processed += 1

    if processed >= limit:
        break  # 达到生成限制后停止
```

**关键点**：

1. **检查顺序**：先检查文件是否存在，再决定是否生成
2. **跳过不计数**：跳过的单词不计入 `processed` 计数
3. **limit 含义**：`--limit N` 表示**生成** N 个图片，而非处理 N 个单词
4. **force 优先级最高**：`--force` 会忽略文件存在检查

**示例说明**：

```bash
# 假设 CSV 有 10 个单词：[apple, banana, cat, dog, elephant, fish, grape, house, ice, juice]
# 已存在图片：apple.jpg, cat.jpg, elephant.jpg

# 命令：--limit 5（不使用 --force）
python3 generate_word_images.py --csv words.csv --limit 5

# 处理过程：
# 1. apple     -> 跳过（已存在）
# 2. banana    -> 生成（processed=1）
# 3. cat       -> 跳过（已存在）
# 4. dog       -> 生成（processed=2）
# 5. elephant  -> 跳过（已存在）
# 6. fish      -> 生成（processed=3）
# 7. grape     -> 生成（processed=4）
# 8. house     -> 生成（processed=5）
# 9. ice       -> 不处理（已达 limit）
# 10. juice    -> 不处理（已达 limit）

# 结果：生成 5 个新图片，跳过 3 个已有图片，共遍历 8 个单词
```

**文件命名规则**：

- 图片文件名：`{word}.jpg`（单词小写）
- 示例：`apple.jpg`, `banana.jpg`, `ice-cream.jpg`
- 特殊字符：连字符和撇号保留，其他字符会被过滤

---

## 📞 相关资源

### 工具文件

- **单词扫描工具**: `proj/tools/scan_words.py`
- **图片生成工具**: `proj/tools/generate_word_images.py`

### 配置和日志

- **图片生成配置**: `proj/tools/generate_word_images.json`
- **运行日志**: `proj/tools/generate_word_images.log`

### 输入输出目录

- **单词 JSON 目录**: `proj/words/`
- **单词 CSV 文件**: `proj/words/words.csv`
- **生成图片目录**: `proj/images/generated/`

### API 相关

- **SiliconFlow 官网**: https://siliconflow.cn
- **API 文档**: https://docs.siliconflow.cn

---

## 🗂️ 文件结构

```
proj/
├── tools/
│   ├── scan_words.py                 # 单词扫描工具
│   ├── generate_word_images.py       # 图片生成工具
│   ├── generate_word_images.json     # 配置文件
│   ├── generate_word_images.log      # 运行日志
│   └── README.md                     # 本文档
├── words/
│   ├── unit1.json                    # 单词 JSON 文件
│   ├── unit2.json
│   ├── ...
│   └── words.csv                     # 扫描生成的 CSV
└── images/
    └── generated/
        ├── apple.jpg                 # 生成的图片
        ├── banana.jpg
        └── ...
```

---

## 📝 更新日志

### v2.2 (2025-01-14)

- 📚 添加智能跳过机制详细说明
- 📚 添加智能跳过最佳实践
- 📚 添加智能跳过逻辑技术详解（附录 E）
- 🐛 新增故障排查：工具没有生成任何图片
- 🐛 新增故障排查：如何查看跳过了哪些单词
- 💡 添加实用技巧：查看还有多少单词未生成

### v2.1 (2025-01-14)

- 📚 添加 `scan_words.py` 详细使用说明
- 📚 添加完整工作流程示例
- 📚 添加文件结构说明
- 🎨 优化文档结构和排版

### v2.0 (2025-01-14)

- ✨ 新增 `guidance_scale` 参数支持
- ✨ 新增 `num_inference_steps` 参数支持
- ✨ 新增 `negative_prompt` 参数支持
- 🔧 改进配置文件管理
- 📝 完善图片生成工具文档说明

### v1.0

- 🎉 初始版本
- ✅ `scan_words.py` - 单词扫描工具
- ✅ `generate_word_images.py` - 图片生成工具
- ✅ CSV 批量处理
- ✅ 失败重试机制

---

**最后更新**: 2025-01-14
