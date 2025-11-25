# cPanel Setup Guide for Germ-in-Game

## Prerequisites
- cPanel hosting with PHP 8.1+
- MySQL 8.0+ database
- SSH access (recommended)
- Composer installed
- Node.js 16+ installed

## Step 1: Database Setup

1. Log in to cPanel
2. Go to "MySQL® Databases"
3. Create a new database
4. Create a database user with all privileges
5. Note down the database name, username, and password

## Step 2: Upload Files

### Option A: Using File Manager
1. Go to "File Manager" in cPanel
2. Navigate to `public_html`
3. Upload the contents of the `dist` folder
4. Create an `api` folder and upload backend files

### Option B: Using SSH (Recommended)
```bash
# Connect to your server
ssh username@yourdomain.com

# Navigate to public_html
cd ~/public_html

# Upload files using rsync (from your local machine)
rsync -avz ./dist/ username@yourdomain.com:~/public_html/
mkdir -p ~/public_html/api
rsync -avz ./php-backend/ username@yourdomain.com:~/public_html/api/
```

## Step 3: Configure Environment

1. In cPanel File Manager, navigate to `public_html/api`
2. Rename `.env.production` to `.env`
3. Edit `.env` with your database credentials and settings
4. Set proper file permissions:
   ```bash
   chmod -R 755 ~/public_html
   chmod -R 755 ~/public_html/api/storage
   chmod -R 755 ~/public_html/api/bootstrap/cache
   ```

## Step 4: Install Dependencies

```bash
# In cPanel Terminal or via SSH
cd ~/public_html/api
composer install --no-dev --optimize-autoloader
php artisan key:generate
php artisan storage:link
```

## Step 5: Run Migrations

```bash
php artisan migrate --force
php artisan db:seed --force
```

## Step 6: Set Up Cron Jobs

In cPanel, go to "Cron Jobs" and add:

```
* * * * * cd /home/username/public_html/api && php artisan schedule:run >> /dev/null 2>&1
```

## Step 7: Configure Web Server

1. In cPanel, go to "MultiPHP Manager"
2. Select your domain and set PHP version to 8.1+
3. Go to "MultiPHP INI Editor" and set:
   - upload_max_filesize = 64M
   - post_max_size = 64M
   - memory_limit = 256M
   - max_execution_time = 300

## Step 8: Set Up SSL Certificate

1. In cPanel, go to "SSL/TLS"
2. Click "Install an SSL Certificate"
3. Select your domain and use "Let's Encrypt"
4. Force HTTPS by adding to `.htaccess`:

```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</IfModule>
```

## Step 9: Verify Installation

1. Visit your domain in a web browser
2. Test the following:
   - Homepage loads
   - User registration/login
   - API endpoints (e.g., `/api/health`)
   - File uploads
   - Email sending

## Troubleshooting

### Common Issues:

1. **500 Internal Server Error**
   - Check error logs in cPanel
   - Verify file permissions
   - Check `.env` configuration

2. **Database Connection Error**
   - Verify database credentials in `.env`
   - Check if MySQL server is running
   - Ensure database user has proper permissions

3. **File Upload Issues**
   - Check PHP upload limits
   - Verify `storage` directory is writable
   - Check `upload_max_filesize` in PHP settings

## Maintenance

### Updating the Application

1. Upload new files
2. Run migrations if needed:
   ```bash
   php artisan migrate --force
   ```
3. Clear caches:
   ```bash
   php artisan optimize:clear
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache
   ```

### Backups

1. **Database Backups**
   - Use cPanel's "Backup" tool
   - Set up automatic backups

2. **File Backups**
   - Back up `public_html` directory
   - Store backups off-site

## Support

For additional help, please contact support@yourdomain.com
