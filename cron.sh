#!/usr/bin/env bash
TMPDIR="./tmp-jsc" node index.js --pull-request --implementation jsc $@;
