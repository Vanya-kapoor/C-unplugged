#ifndef COMMON_STRUCTURES_H
#define COMMON_STRUCTURES_H

#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <time.h>


#define SONGS_FILE "songs.txt"
#define ALBUMS_FILE "albums.dat"
#define LOG_FILE "command_log.txt"

typedef struct Song {
    char song_name[256];
    char singer[256];
    char album[256];
    int minutes;
    int seconds;
    struct Song* next;
} Song;

typedef struct Album {
    char name[256];
    int year;
    Song* songs;
    struct Album* next;
} Album;

typedef struct Playlist {
    Song* song;
    struct Playlist* next;
    struct Playlist* prev;
} Playlist;

typedef struct {
    Playlist* head;
    Playlist* current;
} PlayList;

/* Utility functions for input and strings */
void trim_string(char *s);
void read_line_safe(char* buffer, int size);

#endif