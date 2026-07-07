#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Restore image references in questions.js from encrypted backup."""
import re
import hashlib
import base64
import json

enc_path = r'C:\Users\Admin\WorkBuddy\2026-06-24-22-26-47\usabo-pwa\questions.enc.js'
qs_path = r'C:\Users\Admin\WorkBuddy\2026-06-24-22-26-47\usabo-pwa\questions.js'
password = '510125aa'


def generate_keystream(key_bytes, length):
    stream = bytearray()
    counter = 0
    while len(stream) < length:
        block = hashlib.sha256(key_bytes + counter.to_bytes(4, 'big')).digest()
        stream.extend(block)
        counter += 1
    return bytes(stream[:length])


def decrypt_blob(blob, password):
    key = hashlib.sha256(password.encode('utf-8')).digest()
    encrypted = base64.b64decode(blob)
    keystream = generate_keystream(key, len(encrypted))
    decrypted = bytes(a ^ b for a, b in zip(encrypted, keystream))
    return json.loads(decrypted.decode('utf-8'))


def main():
    with open(enc_path, 'r', encoding='utf-8') as f:
        enc_content = f.read()

    blobs = re.findall(r'"([^"]+)"', enc_content)

    data = None
    for blob in blobs:
        try:
            d = decrypt_blob(blob, password)
            if d.get('student') == 'gmlauder':
                data = d
                break
        except Exception:
            continue

    if not data:
        print('Could not decrypt gmlauder blob')
        return

    image_map = {q['id']: q.get('image') for q in data['questions']}

    with open(qs_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    current_id = None
    changed = 0
    for i, line in enumerate(lines):
        id_match = re.search(r"id:\s*'([A-Z]{3}_\d+)'", line)
        if id_match:
            current_id = id_match.group(1)

        if re.match(r'\s+image:', line) and current_id:
            original_image = image_map.get(current_id)
            if original_image and original_image not in ('（无）', '(无)', ''):
                new_line = re.sub(r'image:\s*[^,\n]+,', f'image: "{original_image}",', line, count=1)
            else:
                new_line = re.sub(r'image:\s*[^,\n]+,', 'image: null,', line, count=1)
            if new_line != line:
                lines[i] = new_line
                changed += 1

    with open(qs_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)

    print(f'Restored image references for {changed} questions from encrypted backup.')


if __name__ == '__main__':
    main()
