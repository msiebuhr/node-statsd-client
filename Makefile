.PHONY: all test lint

all: lint test

src: lib/*
	./node_modules/.bin/tsc

test: src/
	./node_modules/.bin/mocha -R spec --exit

lint: src/
	./node_modules/.bin/jshint lib/ test/
