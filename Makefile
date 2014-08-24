.PHONY: all test lint

all: lint test

test:
	./node_modules/.bin/mocha -R spec

lint:
	./node_modules/.bin/jshint lib/ test/
