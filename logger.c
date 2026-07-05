#include "logger.h"

void save_to_logs(const char* log_command){
    FILE * open_file = fopen(LOG_FILE, "a");
    if(open_file != NULL){
        time_t time_right_now = time(NULL);
        char* time_string = ctime(&time_right_now);
        fprintf(open_file, "%s -> %s\n", time_string, log_command);
        fclose(open_file);
    }
}

void display_log_commands(){
    FILE* open_file = fopen(LOG_FILE, "r");
    if(open_file == NULL){
        printf("No command has been entered till now.");
        return;
    }
    char line[512];
    while(fgets(line, sizeof(line), open_file)){
        printf("%s", line);
    }
    fclose(open_file);
}