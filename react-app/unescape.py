import os
path = 'src/pages/Coach.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('\\`', '`').replace('\\$', '$')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
