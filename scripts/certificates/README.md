# ITS intermediate certificates

The official ITS endpoint omitted its intermediate certificate chain on 2026-09-07. Node failed with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`; a browser/Windows HTTPS client retrieved the missing issuers automatically.

`its-intermediates.pem` contains public CA certificates from a successfully validated Windows/Node TLS connection. No private key is included. Issuer URLs advertised by the endpoint:

- `http://repository.certum.pl/cyberfolks2.cer` — cyber_Folks; SHA-256 `35:F8:CC:89:61:05:08:BC:16:BD:33:2D:A5:43:96:46:98:C7:2D:67:89:5F:EB:4E:06:8B:EA:5E:06:68:64:57`
- `http://repository.certum.pl/gscasha2.cer` — Certum Global Services CA SHA2; SHA-256 `9E:85:2C:59:DF:C6:FD:6A:BD:4E:17:EA:80:B5:F4:E5:6F:C0:41:92:D1:07:25:8D:54:DA:8A:92:52:86:70:D6`

The importer verifies the signatures back to a built-in Node root before using these intermediates, and supplies them only to its ITS HTTPS request. TLS hostname and validity checks remain enabled. Redirects are not followed. If ITS changes issuer, update this bundle from a validated chain; never disable certificate verification. Remove the workaround when the server supplies a complete chain.
