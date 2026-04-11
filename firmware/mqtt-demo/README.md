# MQTT Demo

## Installing ESP-IDF on Windows

1. Download the **ESP-IDF Windows Installer** from the official release page:
   https://github.com/espressif/idf-installer/releases/latest
   Download the file named `esp-idf-tools-setup-online-*.exe` (online installer, recommended).

2. Run the installer and follow the prompts. It will install:
   - ESP-IDF (select version 5.x)
   - Python, CMake, Ninja, and all required toolchains

3. After installation, open **ESP-IDF x.x CMD** or **ESP-IDF x.x PowerShell** from the Start menu. This shell has all environment variables pre-configured.

4. Verify the install:
   ```
   idf.py --version
   ```


**Install dependencies:**
- `idf.py add-dependency espressif/mqtt`

**Run:**
- `idf.py build flash monitor`
