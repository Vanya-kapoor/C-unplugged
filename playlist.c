#include <stdio.h>
#include "playlist.h"


void make_playlist(PlayList* playlist) {
    playlist->head = NULL;
    playlist->current = NULL;
}

void add_songs_to_playlist(PlayList* playlist, Song* song){
    Playlist* node = (Playlist*)malloc(sizeof(Playlist));
    if (!node) {
        perror("Memory allocation failed for playlist node");
        return;
    }

    node->song = song;
    node->next = NULL;
    node->prev = NULL;

    if(playlist->head == NULL){
        playlist->head = node;
        node->next = node;
        node->prev = node;
        playlist->current = node;
    }

    else{
        Playlist* newsongpointer= playlist->head->prev;
        newsongpointer->next = node;
        node->next = playlist->head;
        node->prev = newsongpointer;
        playlist->head->prev = node;
    }
    playlist->current = node;
}

void add_album_to_playlist(PlayList* playlist, Album* album_list){
    char album_name[256];
    printf("Enter name of album you want to include:\n");
    read_line_safe(album_name, sizeof(album_name));

    Album* album = find_given_album(album_list, album_name);

    if(album == NULL){
        printf("\033[1;31mAlbum doesn't exist.\033[0m\n");
        return;
    }
    
    if(album->songs == NULL){
        printf("\033[1;31mThis album is empty. No songs were added.\033[0m\n");
        return;
    }

    Song* curr = album->songs;

    while(curr!= NULL){
        add_songs_to_playlist(playlist, curr);
        curr = curr->next;
    }

    printf("\033[1;32mSongs from %s have been added to the playlist.\033[0m\n", album_name);
}

void add_song_to_playlist(PlayList* playlist, Song** song_list){
    printf("\n\033[1;36m +--------------------------------------+\033[0m\n");
    printf("\033[1;33m | Add Song to Playlist                 |\033[0m\n");
    printf("\033[1;36m +--------------------------------------+\033[0m\n");
    printf("\033[1;32m  [1]\033[0m Add an existing song\n");
    printf("\033[1;32m  [2]\033[0m Create and add a new song\n");
    printf("\n\033[1;35m => Enter choice: \033[0m");
    fflush(stdout);

    char choice_str[32];
    read_line_safe(choice_str, sizeof(choice_str));
    int choice = atoi(choice_str);

    if (choice == 1) {
        list_all_songs(*song_list);
        if (*song_list == NULL) return;
        
        printf("\n\033[1;35m => Enter the serial number of the song: \033[0m");
        fflush(stdout);
        read_line_safe(choice_str, sizeof(choice_str));
        int serial = atoi(choice_str);
        
        if (serial < 1) {
            printf("\033[1;31mInvalid serial number.\033[0m\n");
            return;
        }

        Song* curr = *song_list;
        int count = 1;
        while(curr != NULL && count < serial) {
            curr = curr->next;
            count++;
        }

        if (curr == NULL) {
            printf("\033[1;31mSong with serial number %d doesn't exist.\033[0m\n", serial);
            return;
        }

        add_songs_to_playlist(playlist, curr);
        printf("\033[1;32m%s has been added to the playlist.\033[0m\n", curr->song_name);

    } else if (choice == 2) {
        char song_name[256], singer[256], album[256], time_str[64];
        int minutes = 0, seconds = 0;

        printf("Enter song name:\n");
        read_line_safe(song_name, sizeof(song_name));
        printf("Enter singer name:\n");
        read_line_safe(singer, sizeof(singer));
        printf("Enter album name:\n");
        read_line_safe(album, sizeof(album));
        printf("Enter duration (minutes seconds): ");
        read_line_safe(time_str, sizeof(time_str));
        sscanf(time_str, "%d %d", &minutes, &seconds);

        Song* song = new_song(song_name, singer, album, minutes, seconds);
        add_song_to_song_list(song, song_list);
        save_songs_to_file(*song_list);

        add_songs_to_playlist(playlist, song);
        printf("\033[1;32m%s has been created and added to the playlist.\033[0m\n", song_name);
    } else {
        printf("\033[1;31mInvalid choice.\033[0m\n");
    }
}