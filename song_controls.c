#include <stdio.h>
#include "song_controls.h"

void play_next_song(PlayList* playlist){
    if(playlist->head == NULL){
        printf("\033[1;31mThe playlist is currently empty.\033[0m\n");
        return;
    }

    playlist->current = playlist->current->next;
    printf("\033[1;32m▶ Now playing: %s \033[0;32mby %s\033[0m\n", playlist->current->song->song_name, playlist->current->song->singer);

}

void play_previous_song(PlayList* playlist){
    if(playlist->current == NULL){
        printf("\033[1;31mThe playlist is currently empty.\033[0m\n");
        return;
    }

    playlist->current = playlist->current->prev;
    printf("\033[1;32m▶ Now playing: %s \033[0;32mby %s\033[0m\n", playlist->current->song->song_name, playlist->current->song->singer);

}

void remove_current_song_from_playlist(PlayList* playlist){
    if(playlist->current == NULL){
        printf("\033[1;31mThe playlist is currently empty.\033[0m\n");
        return;
    }
    
    Playlist* curr = playlist->current;

    if(curr->next == curr){
        playlist->head = NULL;
        playlist->current = NULL;
    }

    else{
        curr->next->prev = curr->prev;
        curr->prev->next = curr->next;
        if(playlist->head == curr){
            playlist->head = curr->next;
        }
        playlist->current = curr->next;
    }

    free(curr);
    printf("\033[1;32mSong has been removed from the playlist.\033[0m\n");
}

