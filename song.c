#include "song.h"

Song* new_song(const char* name, const char* singer, const char* album, int minutes, int seconds){
    Song* song = (Song*)malloc(sizeof(Song));
    if (!song) {
    perror("Memory allocation failed for song");
    exit(EXIT_FAILURE);
}

    strncpy(song->song_name, name, 255);
    strncpy(song->album, album, 255);
    strncpy(song->singer, singer, 255);
    song->minutes = minutes;
    song->seconds = seconds;
    song->next = NULL;
    return song;
}

void add_song_to_song_list(Song* song, Song** song_list){
    if(*song_list == NULL){
        *song_list = song;
    }
    else{
    Song* curr = *song_list;

    while(curr -> next != NULL){
        curr = curr->next;
    }

    curr->next = song;
}
}

void list_all_songs(Song* song_list){

    if(song_list == NULL){
        printf("\033[1;31mNo songs currently exist in the database.\033[0m\n");
        return;
    }

    Song* curr = song_list;
    int count = 1;

    while(curr!= NULL){
        printf("%d) %s\nDuration: %02d:%02d\nAlbum: %s\n",
       count, curr->song_name, curr->minutes, curr->seconds, curr->album);

        curr = curr->next;
        count++;
    }
}

Song* find_song(const char* name, Song* song_list){
    Song* curr = song_list;
    while(curr != NULL){
        if(strcmp(curr-> song_name, name) == 0) return curr;
        curr = curr->next;
    }
    return NULL;
}


void load_songs_from_song_file(Song** song_list){
    FILE* fo = fopen(SONGS_FILE, "r");
    if(fo == NULL) return;

    int minutes, seconds;
    char song_name[256], singer[256], album[256];

   while(fscanf(fo, " %[^,], %[^,], %[^,], %d, %d", song_name, singer, album, &minutes, &seconds) == 5){


        Song* song = new_song(song_name, singer, album, minutes, seconds);
        add_song_to_song_list(song, song_list);
    }
    fclose(fo);
}

void save_songs_to_file(Song* song_list){
    FILE* fo = fopen(SONGS_FILE, "w");
    if(fo == NULL) return;

    Song* curr = song_list;
    while(curr != NULL){
        fprintf(fo, "%s,%s,%s,%d,%d\n", curr->song_name, curr->singer, curr->album, curr->minutes, curr->seconds);
        curr = curr->next;
    }
    fclose(fo);
}
