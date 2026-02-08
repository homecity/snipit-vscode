# Snipit.sh - Secure Code Sharing

Share code snippets securely with **AES-256-GCM client-side encryption**. Your code is encrypted before it leaves your machine.

![Snipit.sh](https://snipit.sh/og-image.png)

## Features

### 🔒 End-to-End Encryption
All snippets are encrypted client-side using AES-256-GCM. The encryption key stays in the URL fragment (never sent to the server).

### 🔥 Burn After Read
Share sensitive code that self-destructs after being viewed once.

### 🔑 Password Protection
Add an extra layer of security with password-protected snippets.

### ⏰ Expiry Options
Set your snippets to expire after 1 hour, 24 hours, 7 days, 30 days, or never.

### 📜 Share History
Keep track of all your shared snippets in the sidebar.

## Usage

### Share Code

1. **Keyboard Shortcut**: `Ctrl+Shift+S` (Cmd+Shift+S on Mac)
2. **Context Menu**: Right-click on selected text → "Share on Snipit.sh"
3. **Command Palette**: `Ctrl+Shift+P` → "Snipit: Share on Snipit.sh"

### Paste from Snipit.sh

1. **Keyboard Shortcut**: `Ctrl+Shift+V` (Cmd+Shift+V on Mac)
2. **Command Palette**: `Ctrl+Shift+P` → "Snipit: Paste from Snipit.sh"

Enter a Snipit.sh URL and the content will be inserted at your cursor position.

### View History

Click the Snipit.sh icon in the Activity Bar to see your share history. Click any item to copy its URL.

## Commands

| Command | Keybinding | Description |
|---------|------------|-------------|
| `Snipit: Share on Snipit.sh` | `Ctrl+Shift+S` | Share selected text or file |
| `Snipit: Paste from Snipit.sh` | `Ctrl+Shift+V` | Fetch and insert snippet |
| `Snipit: Refresh History` | - | Refresh the history view |
| `Snipit: Clear History` | - | Clear all history |

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `snipit.defaultExpiry` | `24h` | Default expiry time (`1h`, `24h`, `7d`, `30d`, `never`) |
| `snipit.defaultVisibility` | `public` | Default visibility (`public`, `password`, `burn`) |
| `snipit.apiUrl` | `https://snipit.sh` | API base URL |
| `snipit.maxHistoryItems` | `50` | Maximum history items to store |

## Security

- **Client-side encryption**: Your code is encrypted in VS Code before being uploaded
- **Zero-knowledge**: The server never sees your decryption key
- **AES-256-GCM**: Military-grade encryption algorithm
- **URL fragment keys**: Encryption keys in `#fragment` are never sent to servers

### How it works

1. Your code is encrypted locally using AES-256-GCM
2. Only the encrypted blob is sent to snipit.sh
3. The decryption key is placed in the URL fragment (`#key`)
4. URL fragments are never sent to servers (per HTTP spec)
5. Only someone with the full URL can decrypt the content

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch for changes
npm run watch

# Test locally
code --extensionDevelopmentPath=.
```

## Contributing

Contributions are welcome! Please open an issue or submit a PR.

## License

MIT License - see [LICENSE](LICENSE) for details.

---

Made with ❤️ by [snipit.sh](https://snipit.sh)
