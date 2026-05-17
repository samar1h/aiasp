#!/usr/bin/env python3
"""
habits-encrypt.py
─────────────────────────────────────────────────────────────────────────────
Encrypts your habits.yml for use with the Habits web app.

Security model:
  • Key derivation : PBKDF2-HMAC-SHA256, 600 000 iterations, 32-byte salt
  • Encryption     : AES-256-GCM (authenticated – detects tampering)
  • Output format  : JSON  { v, salt, iv, ct, iter }  (all base64)

Usage:
  pip install cryptography
  python habits-encrypt.py habits.yml
  python habits-encrypt.py habits.yml -o habits.enc
  python habits-encrypt.py habits.yml --iterations 800000

Deploy:  upload  index.html  +  habits.enc  to the same folder (e.g. gh-pages root).
─────────────────────────────────────────────────────────────────────────────
"""

import os
import sys
import json
import base64
import getpass
import argparse

# ── Dependency check ──────────────────────────────────────────────────────────
try:
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
except ImportError:
    print("✗  cryptography package not found.")
    print("   Install it with:  pip install cryptography")
    sys.exit(1)


# ── Defaults ──────────────────────────────────────────────────────────────────
DEFAULT_ITERATIONS = 600_000
FORMAT_VERSION     = 1


# ── Core functions ────────────────────────────────────────────────────────────

def derive_key(password: str, salt: bytes, iterations: int) -> bytes:
    """PBKDF2-HMAC-SHA256 → 32-byte AES key."""
    kdf = PBKDF2HMAC(
        algorithm  = hashes.SHA256(),
        length     = 32,
        salt       = salt,
        iterations = iterations,
    )
    return kdf.derive(password.encode("utf-8"))


def encrypt(plaintext: str, password: str, iterations: int) -> dict:
    """
    Encrypt plaintext with AES-256-GCM.
    Returns a dict ready to be JSON-serialised.
    """
    salt = os.urandom(32)   # 256-bit PBKDF2 salt
    iv   = os.urandom(12)   # 96-bit GCM nonce (NIST recommended)

    key        = derive_key(password, salt, iterations)
    aesgcm     = AESGCM(key)
    ciphertext = aesgcm.encrypt(iv, plaintext.encode("utf-8"), None)

    return {
        "v"    : FORMAT_VERSION,
        "iter" : iterations,
        "salt" : base64.b64encode(salt).decode(),
        "iv"   : base64.b64encode(iv).decode(),
        "ct"   : base64.b64encode(ciphertext).decode(),   # ciphertext || 16-byte GCM tag
    }


def decrypt(enc_obj: dict, password: str) -> str:
    """Round-trip verification: decrypt and return plaintext."""
    salt = base64.b64decode(enc_obj["salt"])
    iv   = base64.b64decode(enc_obj["iv"])
    ct   = base64.b64decode(enc_obj["ct"])
    it   = enc_obj.get("iter", DEFAULT_ITERATIONS)

    key    = derive_key(password, salt, it)
    aesgcm = AESGCM(key)
    plain  = aesgcm.decrypt(iv, ct, None)
    return plain.decode("utf-8")


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Encrypt a YAML habits file for the Habits web app.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("input",  help="Path to your habits YAML file  (e.g. habits.yml)")
    parser.add_argument("-o", "--output",  default="habits.enc",
                        help="Output path for the encrypted file  (default: habits.enc)")
    parser.add_argument("--iterations", type=int, default=DEFAULT_ITERATIONS,
                        help=f"PBKDF2 iterations  (default: {DEFAULT_ITERATIONS:,}). "
                             "Higher = slower brute-force.")
    parser.add_argument("--verify", action="store_true", default=True,
                        help="Verify decryption after encrypting  (default: on)")
    args = parser.parse_args()

    # ── Read input ────────────────────────────────────────────────────────────
    if not os.path.isfile(args.input):
        print(f"✗  File not found: {args.input!r}")
        sys.exit(1)

    with open(args.input, "r", encoding="utf-8") as fh:
        content = fh.read()

    if not content.strip():
        print("✗  Input file is empty.")
        sys.exit(1)

    print(f"  Input  : {args.input}  ({len(content):,} chars)")
    print(f"  Output : {args.output}")
    print(f"  Iter   : {args.iterations:,}")
    print()

    # ── Password ──────────────────────────────────────────────────────────────
    password = getpass.getpass("  Enter encryption key  : ")
    confirm  = getpass.getpass("  Confirm encryption key: ")

    if password != confirm:
        print("\n✗  Keys do not match.")
        sys.exit(1)

    if len(password) < 8:
        print("\n⚠  Warning: key is very short. A longer passphrase is safer.")
        go = input("  Continue anyway? [y/N] ").strip().lower()
        if go != "y":
            sys.exit(0)

    # ── Encrypt ───────────────────────────────────────────────────────────────
    print("\n  Encrypting…  (this may take a few seconds)")
    enc_obj = encrypt(content, password, args.iterations)

    # ── Verify round-trip ─────────────────────────────────────────────────────
    if args.verify:
        try:
            recovered = decrypt(enc_obj, password)
            assert recovered == content, "Round-trip mismatch!"
        except Exception as exc:
            print(f"\n✗  Verification failed: {exc}")
            sys.exit(1)

    # ── Write output ──────────────────────────────────────────────────────────
    with open(args.output, "w", encoding="utf-8") as fh:
        json.dump(enc_obj, fh, separators=(",", ":"))   # compact – no extra whitespace

    size = os.path.getsize(args.output)
    print(f"\n✓  Encrypted → {args.output!r}  ({size:,} bytes)")
    print("  Round-trip verification: passed ✓")
    print()
    print("  Next steps:")
    print(f"    1. Upload  index.html  and  {args.output}  to the same directory.")
    print("    2. Open the app in your browser and enter your key.")
    print()


if __name__ == "__main__":
    main()
