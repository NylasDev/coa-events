#!/bin/bash

# Script to fix file permissions for COA Events application

# Set the base directory (change this to your actual application directory on the server)
BASE_DIR="/home/stackaca/node_spice"

# Make sure the script is being run as the correct user
echo "Running as user: $(whoami)"
echo "Fixing permissions for: $BASE_DIR"

# Fix ownership - replace 'stackaca' with your actual cPanel username if different
echo "Setting ownership..."
chown -R stackaca:stackaca $BASE_DIR

# Fix directory permissions (755 = rwxr-xr-x)
echo "Setting directory permissions..."
find $BASE_DIR -type d -exec chmod 755 {} \;

# Fix file permissions (644 = rw-r--r--)
echo "Setting file permissions..."
find $BASE_DIR -type f -exec chmod 644 {} \;

# Make script files executable (like server.js)
echo "Making scripts executable..."
chmod +x $BASE_DIR/server.js
chmod +x $BASE_DIR/lib/*.js

# Special focus on the problematic logo directory
echo "Focusing on the logo directory..."
chmod -R 755 $BASE_DIR/public/images
chmod -R 644 $BASE_DIR/public/images/logo/*
chmod -R 644 $BASE_DIR/public/icons/events/*

# Create a symlink for the lowercase version if it doesn't exist
echo "Creating symlink to handle case-sensitivity issues..."
if [ ! -f "$BASE_DIR/public/images/logo/logo-32.webp" ]; then
    ln -sf "$BASE_DIR/public/images/logo/LOGO-32.webp" "$BASE_DIR/public/images/logo/logo-32.webp"
    echo "Created symlink from logo-32.webp to LOGO-32.webp"
fi

echo "Permissions fixed!"

# List the current permissions of the logo file to verify
echo "Current logo file permissions:"
ls -la $BASE_DIR/public/images/logo/LOGO-32.webp
