PATH:=./node_modules/.bin:${PATH}

.PHONY: all test lint

all: lint test

test:
	vows --spec

lint:
	jshint lib/ test/
