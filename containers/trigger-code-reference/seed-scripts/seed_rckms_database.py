#!/usr/bin/env python
"""
Extract conditions from the RCKMS CSV files and load them into the SQLite database.

A significantly pared down version of the original script to seed the RCKMS database. This script will extract the conditions from the RCKMS CSV in assets (downloaded from https://www.rckms.org/content-repository) files and load them into the SQLite database.
"""

import csv
import os
import sqlite3

from tqdm import tqdm

db_name = "./rckms.db"
os.remove(db_name)
with sqlite3.connect(db_name) as con:
    with open("./migrations/rckms_create_Tables_add_indexes.sql") as f:
        con.executescript(f.read())
    con.commit()

    with open(
        "../assets/RCKMS Condition Codes.csv",
        encoding="utf-8",
    ) as file:
        reader = csv.reader(file)
        cur = con.cursor()
        next(reader)
        for row in tqdm(reader, desc="Loading conditions", unit=" conditions"):
            cur.execute(
                "INSERT INTO conditions (id, system, name, description) VALUES (?, ?, ?, ?)",
                (row[2], "http://snomed.info/sct", row[0], row[3]),
            )
        con.commit()
