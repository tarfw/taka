import os
import base64

def run():
    with open('sign/assets/stamp.png', 'rb') as f:
        stamp_b64 = base64.b64encode(f.read()).decode('utf-8')
    with open('sign/assets/signature.png', 'rb') as f:
        sig_b64 = base64.b64encode(f.read()).decode('utf-8')
    with open('sign/assets/stamp_and_signature.png', 'rb') as f:
        comb_b64 = base64.b64encode(f.read()).decode('utf-8')

    with open('sign/assets_data.js', 'w', encoding='utf-8') as f:
        f.write('window.ASSETS = {\n')
        f.write(f'  stamp: "data:image/png;base64,{stamp_b64}",\n')
        f.write(f'  signature: "data:image/png;base64,{sig_b64}",\n')
        f.write(f'  combined: "data:image/png;base64,{comb_b64}"\n')
        f.write('};\n')
    print("Exported assets_data.js successfully")

if __name__ == '__main__':
    run()
