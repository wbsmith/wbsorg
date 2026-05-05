#!/bin/bash
set -e

# Build Astro static site
npm run build

# Assemble .amplify-hosting
rm -rf .amplify-hosting
mkdir -p .amplify-hosting/static .amplify-hosting/compute/default

# Static assets from Astro build
cp -r dist/* .amplify-hosting/static/

# Compute function + dependencies
cp compute/entry.mjs .amplify-hosting/compute/default/
cp -r compute/node_modules .amplify-hosting/compute/default/

# Deploy manifest
cat > .amplify-hosting/deploy-manifest.json << 'EOF'
{
  "version": 1,
  "routes": [
    {"path": "/_astro/*", "target": {"kind": "Static"}, "headers": {"cache-control": "public, max-age=31536000, immutable"}},
    {"path": "/*.*", "target": {"kind": "Static"}, "fallback": {"kind": "Compute", "src": "default"}},
    {"path": "/writing/*", "target": {"kind": "Compute", "src": "default"}},
    {"path": "/*", "target": {"kind": "Compute", "src": "default"}}
  ],
  "computeResources": [{"name": "default", "entrypoint": "entry.mjs", "runtime": "nodejs22.x"}],
  "framework": {"name": "astro", "version": "6.0.0"}
}
EOF

echo "Build complete. .amplify-hosting ready."
