import json
import os

os.chdir('d:/workspace/WordPractice/proj')

try:
    with open('words/daily-phonics/day01.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    print('✅ day01.json is valid JSON')
    print(f'ID: {data["metadata"]["id"]}')
    print(f'Name: {data["metadata"]["name"]}')
except Exception as e:
    print(f'❌ Error: {e}')

