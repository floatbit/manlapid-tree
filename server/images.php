<?php
function uploadRoot(): string { return getenv('KINFOLK_UPLOAD_ROOT') ?: dirname(__DIR__).'/uploads'; }
function imageFilePath(string $path): ?string {
    if (!preg_match('~^uploads/(people|milestones|albums|recipes)/[a-zA-Z0-9_-]{1,64}/[0-9]{4}/[0-9]{2}/[a-f0-9]{64}\.(jpg|png|webp|mp4|mov)$~D',$path)) return null;
    return uploadRoot().'/'.substr($path,8);
}
function validateStoredImage(string $photo,string $kind,string $id,bool $original=false): string {
    if ($photo === '') return '';
    if (!in_array($kind,['milestones','albums'],true) && (str_starts_with($photo,'data:video/') || preg_match('/\.(mp4|mov)$/',$photo))) throw new InvalidArgumentException('Portraits must be images.');
    if (str_starts_with($photo,'uploads/')) {
        $file=imageFilePath($photo);
        if (!$file || !str_starts_with($photo,"uploads/$kind/$id/") || !is_file($file)) throw new InvalidArgumentException('Photo file is missing or belongs to a different record.');
        return $photo;
    }
    if (str_starts_with($photo,'data:video/mp4;base64,') || str_starts_with($photo,'data:video/quicktime;base64,')) {
        if (strlen($photo)>140000000) throw new InvalidArgumentException('Choose MP4 or MOV videos under 100 MB.');
        $mov=str_starts_with($photo,'data:video/quicktime;');$bytes=base64_decode(explode(',',$photo,2)[1],true);
        $mime=$bytes===false?'':(new finfo(FILEINFO_MIME_TYPE))->buffer($bytes);
        if ($bytes===false || strlen($bytes)>100000000 || strlen($bytes)<24 || ($mov?!in_array($mime,['video/quicktime','video/mp4'],true):(substr($bytes,4,4)!=='ftyp'||!in_array($mime,['video/mp4','application/mp4'],true)))) throw new InvalidArgumentException('Invalid MP4 or MOV video.');
        return $photo;
    }
    if (!preg_match('~^data:image/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$~D',$photo,$match)) throw new InvalidArgumentException('Invalid photo format.');
    $bytes=base64_decode($match[2],true);$size=$bytes===false?false:@getimagesizefromstring($bytes);
    if (!$size || strlen($bytes)>($original?20000000:2500000) || $size[0]>($original?30000:2400) || $size[1]>($original?30000:2400) || !in_array($size['mime'],['image/jpeg','image/png','image/webp'],true)) throw new InvalidArgumentException('Invalid photo or photo too large.');
    return $photo;
}
function storeImage(string $photo,string $kind,string $id,bool $original=false): string {
    validateStoredImage($photo,$kind,$id,$original);
    if ($photo==='') return $photo;
    if (str_starts_with($photo,'uploads/')) return str_ends_with($photo,'.mov')?convertMovFile(imageFilePath($photo),substr($photo,8)):$photo;
    $bytes=base64_decode(explode(',',$photo,2)[1],true);
    $extension=str_starts_with($photo,'data:video/quicktime;')?'mov':(str_starts_with($photo,'data:video/mp4;')?'mp4':['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'][getimagesizefromstring($bytes)['mime']]);
    $relative="$kind/$id/".gmdate('Y/m').'/'.hash('sha256',$bytes).'.'.$extension;
    $file=uploadRoot().'/'.$relative;
    if (!is_dir(dirname($file)) && !@mkdir(dirname($file),0755,true) && !is_dir(dirname($file))) throw new RuntimeException('The uploads directory is not writable.');
    if (!is_file($file)) {
        $temp=tempnam(dirname($file),'.upload-');
        if (!$temp || file_put_contents($temp,$bytes,LOCK_EX)!==strlen($bytes) || !rename($temp,$file)) {if($temp)@unlink($temp);throw new RuntimeException('Could not save the photo file.');}
        chmod($file,0644);
    }
    return $extension==='mov'?convertMovFile($file,$relative):'uploads/'.$relative;
}

function convertMovFile(string $file,string $relative): string {
    $converted=dirname($relative).'/'.hash('sha256',$relative.'|h264-v1').'.mp4';$target=uploadRoot().'/'.$converted;
    if (is_file($target)) return 'uploads/'.$converted;
    $binary=getenv('KINFOLK_FFMPEG') ?: null;
    if (!$binary) foreach(['/opt/homebrew/bin/ffmpeg','/usr/local/bin/ffmpeg','/usr/bin/ffmpeg'] as $candidate) if(is_executable($candidate)){$binary=$candidate;break;}
    if (!$binary || !is_callable('proc_open')) throw new RuntimeException('MOV conversion needs FFmpeg on the server. Upload an MP4 instead.');
    $temp=tempnam(dirname($target),'.convert-');$errors=tempnam(dirname($target),'.conversion-log-');
    if(!$temp||!$errors)throw new RuntimeException('Could not prepare video conversion.');
    $command=[$binary,'-nostdin','-hide_banner','-loglevel','error','-y','-i',$file,'-map','0:v:0','-map','0:a?','-vf',"scale=w='min(1920,iw)':h='min(1920,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",'-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-movflags','+faststart','-f','mp4',$temp];
    $process=proc_open($command,[0=>['file','/dev/null','r'],1=>['file','/dev/null','w'],2=>['file',$errors,'w']],$pipes);
    $exit=is_resource($process)?proc_close($process):-1;@unlink($errors);
    if($exit!==0||!is_file($temp)||filesize($temp)===0){@unlink($temp);throw new RuntimeException('This MOV could not be converted. Try exporting it as MP4.');}
    if(!rename($temp,$target)){@unlink($temp);throw new RuntimeException('Could not save the converted video.');}
    chmod($target,0644);return 'uploads/'.$converted;
}

function cleanHeadshotCrop($value): ?array {
    if($value===null)return null;
    if(!is_array($value))throw new InvalidArgumentException('Invalid headshot crop.');
    $clean=[];
    foreach(['zoom'=>[1,10],'x'=>[0,1],'y'=>[0,1]] as $key=>[$min,$max]){
        $number=$value[$key]??null;
        if(!is_int($number)&&!is_float($number))throw new InvalidArgumentException('Invalid headshot crop.');
        if(!is_finite((float)$number)||$number<$min||$number>$max)throw new InvalidArgumentException('Invalid headshot crop.');
        $clean[$key]=(float)$number;
    }
    return $clean;
}
