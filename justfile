@_:
	just --list

setup:
	chmod +x .githooks/*
	git config --local core.hooksPath .githooks