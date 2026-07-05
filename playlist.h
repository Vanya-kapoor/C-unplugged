#ifndef PLAYLIST_H
#define PLAYLIST_H

#include "common_structures.h"
#include "song.h"
#include "album.h"

void make_playlist(PlayList* playlist);
void add_songs_to_playlist(PlayList* playlist, Song* song);
void add_album_to_playlist(PlayList* playlist, Album* album_list);
void add_song_to_playlist(PlayList* playlist, Song** song_list);
#endif