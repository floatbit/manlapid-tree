<?php
function cleanPhotoCaption($caption): string {
    if(!is_string($caption)||mb_strlen($caption)>2000)throw new InvalidArgumentException('Captions must be at most 2,000 characters.');
    return trim($caption);
}
function photoCaptions(PDO $db): array {
    $captions=[];
    foreach($db->query("SELECT file_path,MAX(caption) AS caption FROM family_media WHERE media_type='image' AND owner_type<>'person' AND caption IS NOT NULL AND caption<>'' GROUP BY file_path")->fetchAll() as $row)$captions[$row['file_path']]=$row['caption'];
    return $captions;
}
function savePhotoCaption(PDO $db,string $photo,$value): void {
    $caption=cleanPhotoCaption($value);
    $find=$db->prepare("SELECT 1 FROM family_media WHERE file_path=? AND media_type='image' AND owner_type<>'person' LIMIT 1");$find->execute([$photo]);
    if(!$find->fetchColumn())throw new InvalidArgumentException('Save this photo before adding a caption.');
    $save=$db->prepare("UPDATE family_media SET caption=? WHERE file_path=? AND media_type='image' AND owner_type<>'person'");$save->execute([$caption===''?null:$caption,$photo]);
}
function saveAlbumPhotoCaptions(PDO $db,string $albumId,$captions): void {
    if(!is_array($captions)||count($captions)>10000)throw new InvalidArgumentException('Invalid album captions.');
    $find=$db->prepare("SELECT file_path FROM family_media WHERE owner_type='album' AND owner_id=? AND display_order=? AND media_type='image' LIMIT 1");
    foreach($captions as $entry){
        if(!is_array($entry)||!is_int($entry['index']??null)||$entry['index']<0)throw new InvalidArgumentException('Invalid photo caption.');
        $find->execute([$albumId,$entry['index']]);$path=$find->fetchColumn();
        if(!$path)throw new InvalidArgumentException('A captioned photo is no longer in this album.');
        savePhotoCaption($db,$path,$entry['caption']??null);
    }
}
function importPhotoCaptions(PDO $db,$assignments): void {
    if(!is_array($assignments)||count($assignments)>100000)throw new InvalidArgumentException('Invalid photo captions.');
    $find=$db->prepare("SELECT file_path FROM family_media WHERE owner_type=? AND owner_id=? AND display_order=? AND media_type='image' LIMIT 1");
    foreach($assignments as $entry){
        if(!is_array($entry)||!in_array($entry['type']??null,['album','recipe','milestone','person_photo'],true)||!is_string($entry['owner']??null)||!is_int($entry['index']??null)||!is_string($entry['fingerprint']??null))throw new InvalidArgumentException('Invalid photo captions.');
        $caption=cleanPhotoCaption($entry['caption']??null);
        $find->execute([$entry['type'],$entry['owner'],$entry['index']]);$path=$find->fetchColumn();
        if(!$path||basename($path)!==$entry['fingerprint'])continue;
        // Restore without overwriting a caption someone has since added to an existing photo.
        if(!isset(photoCaptions($db)[$path]))savePhotoCaption($db,$path,$caption);
    }
}
