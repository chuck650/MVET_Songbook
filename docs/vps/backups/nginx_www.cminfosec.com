# vim: set syntax=nginx ft=nginx

map $document_uri $wp_document_uri {
  "~^/site(/.*)$" $1;
}

map $fastcgi_script_name $wp_script_name {
  "~^/site(/.*)$" $1;
}

include /etc/nginx/snippets/content_security_policy_map.conf;

server {

  root /var/www/cminfosec.com;

  index index.php index.html;
  
  server_name cminfosec.com www.cminfosec.com;

  error_log  /var/log/nginx/com.cminfosec.www-error.log notice;
  access_log /var/log/nginx/com.cminfosec.www-access.log;

  location = /favicon.ico {
    log_not_found off;
    access_log off;
  }

  location / {
    try_files $uri @wordpress;
  }

  location /wp-content/uploads {
    location ~ \.php$ { return 403; }
    try_files $uri @wordpress;
  }

  location /wp-admin {
    allow 127.0.0.1/32;
    allow 10.51.50.0/24;
    allow 83.229.67.95/32;
    deny all;  
    try_files _ @wordpress;
  }

  location /nginx_status {
    allow 127.0.0.1/32;
    allow 83.229.67.95/32;
    deny all;  
    stub_status;
  }

  location @wordpress {
    rewrite ^(.*)$ /site$1;
  }

  location /site {
    alias /srv/cminfosec.com/wordpress;
    try_files $uri $uri/ /site/index.php?$args;

    location ~ \.php$ {
      try_files $uri =404;
      fastcgi_split_path_info ^/site(/.+\.php)(/.+)$;
      fastcgi_pass php;
      fastcgi_index index.php;
      include fastcgi_params;
      fastcgi_param SCRIPT_FILENAME $request_filename;
      fastcgi_param PATH_INFO $fastcgi_path_info;

      fastcgi_param DOCUMENT_URI $wp_document_uri;
      fastcgi_param SCRIPT_NAME $wp_script_name;
    }
  }

  location ~* wp-config.php { deny all; }

  location /postfix {
    alias /srv/postfixadmin/public;
    try_files $uri $uri/ /postfix/index.php;

    location ~ \.php$ {
      try_files $uri =404;
      fastcgi_split_path_info ^(.+\.php)(/.+)$;
      fastcgi_pass php;
      fastcgi_index index.php;
      include fastcgi_params;
      fastcgi_param SCRIPT_FILENAME $request_filename;
      fastcgi_param PATH_INFO $fastcgi_path_info;
    }
  }

  location @php {
    try_files $uri =404;
    fastcgi_split_path_info ^(.+\.php)(/.+)$;
    fastcgi_pass php;
    fastcgi_index index.php;
    include fastcgi_params;
    fastcgi_param SCRIPT_FILENAME $request_filename;
    fastcgi_param PATH_INFO $fastcgi_path_info;
  }

  listen [::]:443 ssl; # managed by Certbot
  listen 443 quic;
  listen 443 ssl; # managed by Certbot
  http2 on;
  http3 on;
  # quic_bpf on;
  ssl_certificate /etc/letsencrypt/live/cminfosec.com/fullchain.pem; # managed by Certbot
  ssl_certificate_key /etc/letsencrypt/live/cminfosec.com/privkey.pem; # managed by Certbot
  include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
  ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

  ##
  # Security headers implementing tight defaults.
  # Allow fonts from self and Google.
  ##

  add_header Strict-Transport-Security 'max-age=31536000; includeSubDomains; preload';
  add_header Content-Security-Policy $allowed_csp always;
  add_header X-XSS-Protection "1; mode=block";
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header Referrer-Policy "no-referrer-when-downgrade";
  add_header Permissions-Policy "geolocation=(),midi=(),sync-xhr=(),microphone=(),camera=(),magnetometer=(),gyroscope=(),fullscreen=(self),payment=()";

  # OCSP stapling
  ssl_stapling on;
  ssl_stapling_verify on;

  # verify chain of trust of OCSP response using Root CA and Intermediate certs
  ssl_trusted_certificate /etc/letsencrypt/live/cminfosec.com/chain.pem;

  # replace with the IP address of your resolver
  resolver 127.0.0.53;
}

server {
  if ($host = www.cminfosec.com) {
    return 301 https://$host$request_uri;
  } # managed by Certbot


  if ($host = cminfosec.com) {
    return 301 https://$host$request_uri;
  } # managed by Certbot


  listen 80;
  listen [::]:80;

  server_name cminfosec.com www.cminfosec.com;
  return 404; # managed by Certbot
}
