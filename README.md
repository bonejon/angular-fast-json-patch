# angular-fast-json-patch     ![alt travis build status](https://travis-ci.org/bonejon/angular-fast-json-patch.svg?branch=master)
A port of https://github.com/Starcounter-Jack/JSON-Patch wrapped up as an Angular 2+ library

This library is a work in progress to generate a JSON Patch document [RFC4627](https://tools.ietf.org/rfc/rfc6902.txt).

I ported the code from the Json-Patch project and created this module so that it is compatible with Angular 2+. Currently it has only been tested with Angular 4 and only specific operations are known to work.

Currently Tested Operations:
- [ ] add
- [X] remove
- [X] replace
- [ ] move
- [ ] copy
- [ ] test

I will add tests for the remaining operations as time permits.
