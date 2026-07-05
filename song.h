#ifndef SONG_H
#define SONG_H
#include "common_structures.h"

Song* new_song(const char* name, const char* singer, const char* album, int minutes, int seconds);
void add_song_to_song_list(Song* song, Song** song_list);
void list_all_songs(Song* song_list);
Song* find_song(const char* name, Song* song_list);
void load_songs_from_song_file(Song** song_list);
void save_songs_to_file(Song* song_list);


#endif