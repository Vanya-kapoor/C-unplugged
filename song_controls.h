#ifndef SONG_CONTROLS_H
#define SONG_CONTROLS_H

#include "common_structures.h"
#include "song.h"
#include "album.h"
#include "playlist.h"

void play_next_song(PlayList* playlist);
void play_previous_song(PlayList* playlist);
void remove_current_song_from_playlist(PlayList* playlist);


#endif