#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <stdbool.h>
#include "common_structures.h"
#include "logger.h"
#include "song.h"
#include "album.h"
#include "playlist.h"
#include "song_controls.h"
#include <ctype.h>

void trim_string(char *s) {
    char *p = s;
    while (*p && isspace((unsigned char)*p)) p++;
    if (p != s) memmove(s, p, strlen(p)+1);
    size_t len = strlen(s);
    while (len > 0 && isspace((unsigned char)s[len-1])) {
        s[len-1] = '\0';
        len--;
    }
}

void read_line_safe(char* buffer, int size) {
    if (fgets(buffer, size, stdin) != NULL) {
        size_t len = strlen(buffer);
        if (len > 0 && buffer[len-1] == '\n') {
            buffer[len-1] = '\0';
        }
    }
}

void cleanup_all(Song* song_list, Album* album_list, PlayList* playlist) {
    // Free songs
    while (song_list) {
        Song* temp = song_list;
        song_list = song_list->next;
        free(temp);
    }
    // Free albums and their songs
    while (album_list) {
        Album* temp_al = album_list;
        Song* as = temp_al->songs;
        while (as) {
            Song* ts = as;
            as = as->next;
            free(ts);
        }
        album_list = album_list->next;
        free(temp_al);
    }
    // Free playlist nodes
    if (playlist->head) {
        Playlist* curr = playlist->head;
        playlist->head->prev->next = NULL; // break circular link
        while (curr) {
            Playlist* np = curr->next;
            free(curr);
            curr = np;
        }
    }
}

void display_options(PlayList* playlist){
    printf("\033[1;36m\n +=======================================================+\n");
    printf(" ||             \033[1;32m🎵 C-Unplugged Music App 🎵\033[1;36m            ||\n");
    printf(" +=======================================================+\033[0m\n\n");
    
    if (playlist != NULL && playlist->current != NULL && playlist->current->song != NULL) {
        printf(" \033[1;32m▶ NOW PLAYING: \033[1;37m%s \033[0;32mby \033[1;37m%s \033[1;30m(%d:%02d)\033[0m\n", 
            playlist->current->song->song_name, 
            playlist->current->song->singer,
            playlist->current->song->minutes,
            playlist->current->song->seconds);
        printf(" \033[1;36m---------------------------------------------------------\033[0m\n\n");
    }
    printf("\033[1;33m  [1]\033[0m List all songs\n");
    printf("\033[1;33m  [2]\033[0m List all albums\n");
    printf("\033[1;33m  [3]\033[0m Create album\n");
    printf("\033[1;33m  [4]\033[0m View album songs\n");
    printf("\033[1;33m  [5]\033[0m Add song to album\n");
    printf("\033[1;33m  [6]\033[0m Delete song from album\n");
    printf("\033[1;33m  [7]\033[0m Add album to playlist\n");
    printf("\033[1;33m  [8]\033[0m Add song to playlist\n");
    printf("\033[1;33m  [9]\033[0m Play next\n");
    printf("\033[1;33m [10]\033[0m Play previous\n");
    printf("\033[1;33m [11]\033[0m Remove current song from playlist\n");
    printf("\033[1;33m [12]\033[0m View command history\n");
    printf("\033[1;31m  [0]\033[0m Exit\n");
    printf("\n\033[1;35m => Enter your choice: \033[0m");
    fflush(stdout);
}


int main(){
    Song* song_list = NULL;
    Album* album_list = NULL;
    PlayList playlist;
    make_playlist(&playlist);   

    load_album_from_file(&album_list);
    load_songs_from_song_file(&song_list);

    int user_choice;
    char command[256];

    char choice_str[32];
    int first_time = 1;

    while(true){
        if (first_time) {
            display_options(&playlist);
            first_time = 0;
        }

        read_line_safe(choice_str, sizeof(choice_str));
        user_choice = atoi(choice_str);

        snprintf(command, 256 , "User choice: %d", user_choice);
        save_to_logs(command);


        switch (user_choice){
            case 1 : 
                list_all_songs(song_list);
                break;
            case 2 : 
                list_all_albums(album_list);
                break;
            case 3 : 
                create_album_function(&album_list);
                break;
            case 4 : 
                view_songs_in_album(album_list);
                break;
            case 5 :
                add_song_to_album_function(album_list, &song_list);
                break;
            case 6 : 
                delete_song_from_album(album_list);
                break;
            case 7 : 
                add_album_to_playlist(&playlist, album_list);
                break;
            case 8 : 
                add_song_to_playlist(&playlist, &song_list);
                break;
            case 9 : 
                play_next_song(&playlist);
                break;
            case 10 : 
                play_previous_song(&playlist);
                break;
            case 11: 
                remove_current_song_from_playlist(&playlist);
                break;
            case 12: 
                display_log_commands();
                break;
            case 0 :
                save_album_to_file(album_list);
                save_songs_to_file(song_list);
                cleanup_all(song_list, album_list, &playlist);
                printf("\033[1;31mExiting... Albums and Songs saved successfully.\033[0m\n");
                return 0;

            default:
                printf("\033[1;31mInvalid choice. Please choose from the given options.\033[0m\n");
        }   

        int post_action_choice = 0;
        char pa_choice_str[32];
        while(true) {
            printf("\n\033[1;36m +--------------------------------------+\033[0m\n");
            printf("\033[1;33m | What would you like to do next?      |\033[0m\n");
            printf("\033[1;36m +--------------------------------------+\033[0m\n");
            printf("\033[1;31m  [1]\033[0m Exit\n");
            printf("\033[1;32m  [2]\033[0m Show Menu\n");
            printf("\n\033[1;35m => Enter choice: \033[0m");
            fflush(stdout);
            
            read_line_safe(pa_choice_str, sizeof(pa_choice_str));
            post_action_choice = atoi(pa_choice_str);

            if (post_action_choice == 1) {
                save_album_to_file(album_list);
                save_songs_to_file(song_list);
                cleanup_all(song_list, album_list, &playlist);
                printf("\033[1;31mExiting... Albums and Songs saved successfully.\033[0m\n");
                return 0;
            } else if (post_action_choice == 2) {
                display_options(&playlist);
                break;
            } else {
                printf("\033[1;31mInvalid choice. Please enter 1 or 2.\033[0m\n");
            }
        }
    }
    return 0;    
}
























