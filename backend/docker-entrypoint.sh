#!/bin/sh
set -e

echo "🔄 Aplikuji schéma do databáze (prisma db push)..."
n=0
until npx prisma db push --skip-generate; do
  n=$((n + 1))
  if [ "$n" -ge 10 ]; then
    echo "❌ Databáze nedostupná po 10 pokusech, končím."
    exit 1
  fi
  echo "⏳ DB zatím nedostupná, zkouším znovu ($n/10)..."
  sleep 3
done

echo "🏗️  Spouštím backend..."
exec node dist/index.js
