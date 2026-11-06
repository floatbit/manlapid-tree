<?php
// Router for PHP's local development server: never serve configuration/source files.
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/');
if (str_starts_with($path,'/uploads/')) {
    require __DIR__.'/server/images.php';$file=imageFilePath(ltrim($path,'/'));
    if (!$file || !is_file($file)) {http_response_code(404);return true;}
    $size=filesize($file);$start=0;$end=$size-1;
    header('Content-Type: '.mime_content_type($file));header('X-Content-Type-Options: nosniff');header('Cache-Control: public, max-age=31536000, immutable');header('Accept-Ranges: bytes');
    if(isset($_SERVER['HTTP_RANGE'])){
        if(!preg_match('/^bytes=(\d*)-(\d*)$/',$_SERVER['HTTP_RANGE'],$range)||($range[1]===''&&$range[2]==='')){http_response_code(416);header("Content-Range: bytes */$size");return true;}
        if($range[1]==='')$start=max(0,$size-(int)$range[2]);else{$start=(int)$range[1];if($range[2]!=='')$end=min($end,(int)$range[2]);}
        if($start>$end||$start>=$size){http_response_code(416);header("Content-Range: bytes */$size");return true;}
        http_response_code(206);header("Content-Range: bytes $start-$end/$size");
    }
    header('Content-Length: '.($end-$start+1));if($_SERVER['REQUEST_METHOD']==='HEAD')return true;
    $stream=fopen($file,'rb');fseek($stream,$start);$remaining=$end-$start+1;while($remaining>0&&!feof($stream)){ $chunk=fread($stream,min(1048576,$remaining));echo $chunk;$remaining-=strlen($chunk); }fclose($stream);return true;
}
if ($path === '/api.php') { require __DIR__ . '/api.php'; return true; }
if ($path === '/' || $path === '/index.html') { header('Content-Type: text/html; charset=utf-8'); readfile(__DIR__ . '/index.html'); return true; }
// Serve only explicitly listed public assets; server source and backups stay private.
if (in_array($path, [
    '/app.js',
    '/style.css',
    '/export.html',
    '/js/albums.js',
    '/js/backups.js',
    '/js/bulk-location.js',
    '/js/core.js',
    '/js/lightbox.js',
    '/js/location-history.js',
    '/js/location-picker.js',
    '/js/map.js',
    '/js/milestones.js',
    '/js/navigation.js',
    '/js/people.js',
    '/js/overview.js',
    '/js/person-picker.js',
    '/js/recipes.js',
    '/js/relationship-finder.js',
    '/js/relationships.js',
    '/js/sharing.js',
    '/js/sibling-groups.js',
    '/js/children-groups.js',
    '/js/timeline-position.js',
    '/js/tree-controls.js',
    '/js/tree.js',
    '/css/features.css',
], true)) return false;
http_response_code(404); echo 'Not found';
