#!/usr/bin/env bash
TMPDIR="./tmp-jsc" node index.js --pull-request --implementation jsc $@;
TMPDIR="./tmp-v8" node index.js --pull-request --implementation v8 $@;
