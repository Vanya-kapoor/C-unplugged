CC = gcc
CFLAGS = -Wall -Wextra -g -fsanitize=address -MMD -MP

TARGET = c_unplugged
SRCS = main.c song.c album.c playlist.c song_controls.c logger.c
OBJS = $(SRCS:.c=.o)
DEPS = $(SRCS:.c=.d)

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CC) $(CFLAGS) -o $(TARGET) $(OBJS)

%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

clean:
	rm -f $(OBJS) $(DEPS) $(TARGET)

run: all
	./$(TARGET)

-include $(DEPS)

.PHONY: all clean run
