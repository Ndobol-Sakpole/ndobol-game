"""Idempotent SQLite migration + optional local seed, stdlib only."""
import argparse
import pathlib
import sqlite3

root = pathlib.Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument('--database', default=str(root / 'data/ndobol.sqlite'))
parser.add_argument('--seed', action='store_true')
args = parser.parse_args()
with sqlite3.connect(args.database) as db:
    for migration in sorted((root / 'data/migrations').glob('*.sql')):
        version = int(migration.name.split('_')[0])
        if db.execute('PRAGMA user_version').fetchone()[0] < version:
            db.executescript(migration.read_text())
    if args.seed:
        db.executescript((root / 'data/seed.sql').read_text())
    print('SQLite ready:', args.database, '| schema', db.execute('PRAGMA user_version').fetchone()[0])
