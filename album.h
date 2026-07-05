#ifndef ALBUM_H
#define ALBUM_H

#include "common_structures.h"
#include "song.h"

Album* create_new_album(const char* album_name, int year);
void add_new_album_to_list(Album** album_list, Album* album);
Album* find_given_album(Album* album_list, const char* name);
void list_all_albums(Album* album_list);
void add_song_to_album(Album* album, Song* song);
void view_songs_in_album(Album* album_list);
void delete_song_from_album(Album* album_list);
void create_album_function(Album** album_list);
void add_song_to_album_function(Album* album_list, Song** song_list);
void save_album_to_file(Album* album_list);
void load_album_from_file(Album** album_list);


#endif