# Security

Report vulnerabilities through private GitHub security advisories for this repository. Use invented test text, never a production database dump.

The 1.x release line is supported. Search normalization is not HTML sanitization, authorization, identity verification or a Unicode-spoofing detector. Keys deliberately collide. Never use them for passwords, account identity or automatic record merging.

The library returns original text pieces. Render them with escaped framework text nodes or `textContent`, not `innerHTML`. Bidi controls may remain in displayed original text even when omitted from a search key; display policy belongs to the application.

The runtime performs no I/O. Inputs are processed in memory synchronously; each input has a size limit, but collision audits retain their groups and should be batched for large migrations.
