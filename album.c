#include "album.h"
#include <ctype.h> 




Album* create_new_album(const char* album_name, int year){
    Album* album = (Album*)malloc(sizeof(Album));
    if (!album) {
    perror("Memory allocation failed for album");
    exit(EXIT_FAILURE);
    }

    strncpy(album->name, album_name, 255);
    album->name[255] = '\0';
    album->year = year;
    album->songs = NULL;
    album->next = NULL;
    return album;
}


void add_new_album_to_list(Album** album_list, Album* album){

    if(*album_list == NULL) {
        *album_list = album;
        return;
    }

    Album* curr = *album_list;

    while(curr->next!= NULL) curr = curr->next;

    curr->next = album;
}


Album* find_given_album(Album* album_list, const char* name){
    Album* curr = album_list;
    while(curr!= NULL){
        if( strcmp(curr->name, name)==0) return curr;

        curr = curr->next;
    } 
    return NULL;
}


void create_album_function(Album** album_list){
    printf("Enter name of the new album you want to create-\n");
    char name[256];
    read_line_safe(name, sizeof(name)); 
    trim_string(name);

    char year_str[32];
    printf("Enter the year of release of the album-");
    read_line_safe(year_str, sizeof(year_str));
    int year = atoi(year_str); 



    if(find_given_album(*album_list, name)){
        printf("This album already exists.");
       return;
    }
    Album* new_album = create_new_album(name, year);
    add_new_album_to_list(album_list, new_album);
    printf("Album: %s from %d has been added to the list\n", new_album->name, new_album->year);
     save_album_to_file(*album_list);
    printf("Album saved to file.\n");
}




void list_all_albums(Album* album_list){
    if(album_list == NULL){
        printf("\033[1;31mNo albums currently exist in the database.\033[0m\n");
        return;
    }

    Album* curr = album_list;
    while(curr!= NULL){
        printf("Album name: %s \n Year released: %d\n", curr->name, curr->year);
        curr = curr->next;
    }
}

void add_song_to_album(Album* album, Song* song){
    Song* newsong = new_song(song->song_name, song->singer, song->album, song->minutes, song->seconds);
    if(album->songs == NULL) album->songs = newsong;
    else{
        Song* curr = album->songs;
        while(curr->next != NULL) curr = curr->next;
        curr->next = newsong;
    }
}

void add_song_to_album_function(Album* album_list, Song** song_list){
    char album_name[256];
    char song_name[256];

    printf("Enter album name:\n");
    read_line_safe(album_name, sizeof(album_name));
    trim_string(album_name);
    Album* album = find_given_album(album_list, album_name);
    if(album == NULL){
        printf("\033[1;31mThis album does not exist.\033[0m\n");
        
        return;
    }
    printf("Enter the name of the song.\n");
    read_line_safe(song_name, sizeof(song_name));
    Song* song = find_song(song_name, *song_list);

    if(song == NULL){
    char singer[256];
    char time_str[64];
    int minutes, seconds;
    printf("Enter singer name:\n");
    read_line_safe(singer, sizeof(singer));
    printf("Enter duration (minutes seconds): ");
    read_line_safe(time_str, sizeof(time_str));
    sscanf(time_str, "%d %d", &minutes, &seconds);
    song = new_song(song_name, singer, album_name, minutes, seconds);
    add_song_to_song_list(song, song_list);
}
 add_song_to_album(album, song);
 save_album_to_file(album_list);
printf("Album file updated.\n");


    printf("%s has been added to %s\n", song_name, album_name);
}

void view_songs_in_album(Album* album_list){
    char album_name[256];
    printf("Enter the album name you wish to explore:\n");
    read_line_safe(album_name, sizeof(album_name));
    Album* album = find_given_album(album_list, album_name);

    if(album == NULL){
        printf("\033[1;31mThis album doesn't exist.\033[0m\n");
        return;

    }

    if(album->songs == NULL){
        printf("\033[1;31mThis album has no songs.\033[0m\n");
        return;
    }

    Song* curr = album->songs;
    int count = 1;

    while(curr!= NULL){
         printf("%d) %s\nDuration: %02d:%02d\nAlbum: %s\n",
       count, curr->song_name, curr->minutes, curr->seconds, curr->album);

         count++;
         curr = curr->next;
    }
}

void delete_song_from_album(Album* album_list){
    char album_name[256];
    char song_name[256];
    printf("Enter album name:\n");
    read_line_safe(album_name, sizeof(album_name));

    Album* album = find_given_album(album_list, album_name);

    if(album == NULL){
        printf("\033[1;31mEntered album does not exist.\033[0m\n");
        return;
    }
    
    if(album->songs == NULL){
        printf("\033[1;31mThis album has no songs to delete.\033[0m\n");
        return;
    }

    printf("Enter song name to delete:\n");
    read_line_safe(song_name, sizeof(song_name));

    
    Song* prev = NULL;
    Song* curr = album->songs;
    while(curr != NULL && strcmp(curr->song_name, song_name) != 0){
        prev = curr;
        curr = curr->next;
    }

    if(curr == NULL){
        printf("\033[1;31mThis song does not exist in the album.\033[0m\n");
        return;
    }

   if(prev == NULL){
    album->songs = curr->next;
   }
   else{
    prev->next = curr->next;
   }
    free(curr);
    printf("Song has been deleted from library.\n");
}

void save_album_to_file(Album* album_list){
    FILE* fo = fopen(ALBUMS_FILE, "w");
    if(fo == NULL) return;

    Album* album = album_list;
    while(album != NULL){
        fprintf(fo, "ALBUM:%s,%d\n", album->name, album->year);
        Song* song = album->songs;
        while(song != NULL){
           fprintf(fo, "Song:%s,%s,%s,%d,%d\n", song->song_name, song->singer, song->album, song->minutes, song->seconds);
            song = song->next;
        }
        album = album->next;
    }
    fclose(fo);
}

void load_album_from_file(Album** album_list){
    FILE* fo = fopen(ALBUMS_FILE, "r");
    if (!fo) {
    perror("Could not open albums file");
    return;
}

    char album_line[1280];
    Album* curr = NULL;

    while(fgets(album_line, sizeof(album_line), fo)){
        if(strncmp(album_line, "ALBUM:", 6) == 0){
            char name[256];
            int year;
            if (sscanf(album_line + 6, " %[^,], %d", name, &year) == 2) {

                curr = create_new_album(name, year);
                add_new_album_to_list(album_list, curr);
            }

        }
        else if(strncmp(album_line, "Song:", 5) == 0 && curr){
            int minutes, seconds;
            char song_name[256], singer[256], album[256];
           sscanf(album_line + 5, " %[^,], %[^,], %[^,], %d, %d", song_name, singer, album, &minutes, &seconds);


            Song* song = new_song(song_name, singer, album, minutes, seconds);
            if(curr->songs == NULL) curr->songs = song;
            else{
                Song* temp = curr->songs;
                while(temp->next!= NULL) temp = temp->next;
                temp->next = song;
            }
        }
    }
    fclose(fo);
}