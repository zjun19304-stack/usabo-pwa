#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
encrypt_questions.py
=====================================
读取 questions.js，用密码加密成 questions.enc.js。
支持多学生多密码，每个密码关联一个学生姓名。

使用方法：
  python encrypt_questions.py  密码
  python encrypt_questions.py  密码1,密码2,密码3
  python encrypt_questions.py  姓名1:密码1,姓名2:密码2,姓名3:密码3

示例：
  python encrypt_questions.py  USABO2026
  python encrypt_questions.py  classA,classB,teacher
  python encrypt_questions.py  张三:zs123,李四:ls456,老师:teacher789
"""

import sys
import os
import json
import hashlib
import base64
import subprocess

def generate_keystream(key_bytes, length):
    """SHA-256 counter mode keystream"""
    stream = bytearray()
    counter = 0
    while len(stream) < length:
        block = hashlib.sha256(key_bytes + counter.to_bytes(4, 'big')).digest()
        stream.extend(block)
        counter += 1
    return bytes(stream[:length])

def encrypt_data(plaintext, password):
    """Encrypt: password -> SHA-256 key -> keystream XOR -> base64"""
    key = hashlib.sha256(password.encode('utf-8')).digest()
    data = plaintext.encode('utf-8')
    keystream = generate_keystream(key, len(data))
    encrypted = bytes(a ^ b for a, b in zip(data, keystream))
    return base64.b64encode(encrypted).decode('ascii')

def extract_via_node(js_path):
    """Use Node.js to safely extract TOPICS and QUESTIONS as JSON"""
    node_path = r'C:\Users\Admin\.workbuddy\binaries\node\versions\22.22.2\node.exe'
    with open(js_path, 'r', encoding='utf-8') as f:
        js_code = f.read()
    js_code = js_code.replace('const TOPICS', 'var TOPICS')
    js_code = js_code.replace('const QUESTIONS', 'var QUESTIONS')

    import tempfile
    with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False, encoding='utf-8') as tmp:
        tmp.write(js_code)
        tmp.write('\nprocess.stdout.write(JSON.stringify({topics: TOPICS, questions: QUESTIONS}));\n')
        tmp_path = tmp.name

    try:
        result = subprocess.run(
            [node_path, tmp_path],
            capture_output=True, text=True, encoding='utf-8'
        )
        if result.returncode != 0:
            print(f"Node.js 解析失败：{result.stderr}")
            sys.exit(1)
        return json.loads(result.stdout)
    finally:
        os.unlink(tmp_path)

def parse_students(arg):
    """
    解析命令行参数，返回 [(name, password), ...] 列表。
    格式：
      "password"                    -> [("学生", "password")]
      "pass1,pass2"                 -> [("学生1", "pass1"), ("学生2", "pass2")]
      "张三:zs123,李四:ls456"       -> [("张三", "zs123"), ("李四", "ls456")]
    """
    entries = []
    parts = arg.split(',')
    for i, part in enumerate(parts):
        part = part.strip()
        if not part:
            continue
        if ':' in part:
            name, pwd = part.split(':', 1)
            entries.append((name.strip(), pwd.strip()))
        else:
            # 没有姓名，自动生成
            entries.append((f"学生{i+1}", part))
    return entries

def main():
    if len(sys.argv) < 2:
        print("用法：python encrypt_questions.py <密码>")
        print("示例：python encrypt_questions.py USABO2026")
        print("多密码：python encrypt_questions.py pass1,pass2,pass3")
        print("带姓名：python encrypt_questions.py 张三:zs123,李四:ls456,老师:t789")
        sys.exit(1)

    students = parse_students(sys.argv[1])
    if not students:
        print("错误：请提供至少一个密码")
        sys.exit(1)

    # 路径处理
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)
    questions_js = os.path.join(project_dir, 'questions.js')
    output_js = os.path.join(project_dir, 'questions.enc.js')

    if not os.path.exists(questions_js):
        print(f"错误：找不到 {questions_js}")
        sys.exit(1)

    print(f"读取题库：{questions_js}")

    # 用 Node.js 安全提取数据
    data_obj = extract_via_node(questions_js)
    topics = data_obj.get('topics', [])
    questions = data_obj.get('questions', [])

    print(f"   板块数：{len(topics)}")
    print(f"   题目数：{len(questions)}")
    print(f"   学生数：{len(students)}")
    print()

    # 为每个学生生成加密版本（题库数据 + 学生姓名）
    encrypted_blobs = []
    for name, pwd in students:
        # 将学生姓名嵌入加密数据中
        payload = json.dumps({
            'topics': topics,
            'questions': questions,
            'student': name,  # 学生姓名
        }, ensure_ascii=False)

        enc = encrypt_data(payload, pwd)
        encrypted_blobs.append(enc)
        print(f"  [{name}] 密码: {pwd}  加密完成（{len(enc)} 字符）")

    # 生成 questions.enc.js
    blobs_js = ', '.join(json.dumps(b) for b in encrypted_blobs)
    output = "/* USABO encrypted question bank - auto-generated */\n"
    output += "/* Do not upload questions.js to GitHub */\n"
    output += "window.__USABO_ENC__ = [" + blobs_js + "];\n"

    with open(output_js, 'w', encoding='utf-8') as f:
        f.write(output)

    print(f"\n加密题库已生成：{output_js}")
    print(f"   支持 {len(students)} 个学生密码")
    print(f"\n学生密码表：")
    for name, pwd in students:
        print(f"   {name:8s} -> {pwd}")
    print(f"\n下一步：")
    print(f"   1. 将各自的密码告诉学生")
    print(f"   2. git add questions.enc.js auth.js index.html app.js style.css sw.js")
    print(f"   3. git commit -m 'Update student passwords'")
    print(f"   4. git push")
    print(f"\n重要：确保 .gitignore 中包含 questions.js")
    print(f"   原始题库文件不应上传到 GitHub！")

if __name__ == '__main__':
    main()
