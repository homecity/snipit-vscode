# Changelog

All notable changes to the Snipit.sh extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-01-XX

### Added
- Initial release
- Share command with Ctrl+Shift+S
- Context menu integration for sharing selected text
- Paste command with Ctrl+Shift+V
- AES-256-GCM client-side encryption
- Password protection option
- Burn after read option
- Expiry options (1h, 24h, 7d, 30d, never)
- History sidebar with share tracking
- Configurable default settings
- Welcome message on first install

### Security
- All content encrypted client-side before upload
- Encryption keys stored only in URL fragments
- Zero-knowledge architecture - server never sees plaintext
