from pathlib import Path
import shutil
import subprocess


ROOT = Path(__file__).resolve().parents[1]
TARGET_DIR = ROOT / "src" / "client" / "public" / "phonics-audio"
ARCHIVE_DIR = Path("/tmp/wikimedia-phoneme-audio/audio")

CONSONANT_AUDIO = {
    "p.ogg": "Voiceless_bilabial_plosive.ogg",
    "b.ogg": "Voiced_bilabial_plosive.ogg",
    "t.ogg": "Voiceless_alveolar_plosive.ogg",
    "d.ogg": "Voiced_alveolar_plosive.ogg",
    "k.ogg": "Voiceless_velar_plosive.ogg",
    "g.ogg": "Voiced_velar_plosive_02.ogg",
    "f.ogg": "Voiceless_labio-dental_fricative.ogg",
    "v.ogg": "Voiced_labio-dental_fricative.ogg",
    "theta.ogg": "Voiceless_dental_fricative.ogg",
    "eth.ogg": "Voiced_dental_fricative.ogg",
    "s.ogg": "Voiceless_alveolar_sibilant.ogg",
    "z.ogg": "Voiced_alveolar_sibilant.ogg",
    "esh.ogg": "Voiceless_palato-alveolar_sibilant.ogg",
    "ezh.ogg": "Voiced_palato-alveolar_sibilant.ogg",
    "h.ogg": "Voiceless_glottal_fricative.ogg",
    "m.ogg": "Bilabial_nasal.ogg",
    "n.ogg": "Alveolar_nasal.ogg",
    "eng.ogg": "Velar_nasal.ogg",
    "l.ogg": "Alveolar_lateral_approximant.ogg",
    "r.ogg": "Postalveolar_approximant.ogg",
    "j.ogg": "Palatal_approximant.ogg",
    "w.ogg": "Voiced_labio-velar_approximant.ogg",
    "tsh.ogg": "Voiceless_palato-alveolar_affricate.ogg",
    "dzh.ogg": "Voiced_palato-alveolar_affricate.ogg",
}

VOWEL_AUDIO = {
    "i-long.ogg": "Close_front_unrounded_vowel.ogg",
    "i-short.ogg": "Near-close_near-front_unrounded_vowel.ogg",
    "e.ogg": "Close-mid_front_unrounded_vowel.ogg",
    "ae.ogg": "Near-open_front_unrounded_vowel.ogg",
    "a-long.ogg": "Open_back_unrounded_vowel.ogg",
    "o-short.ogg": "Open_back_rounded_vowel.ogg",
    "or-long.ogg": "Open-mid_back_rounded_vowel.ogg",
    "u-short.ogg": "Near-close_near-back_rounded_vowel.ogg",
    "u-long.ogg": "Close_back_rounded_vowel.ogg",
    "uh.ogg": "Open-mid_back_unrounded_vowel.ogg",
    "er-long.ogg": "Open-mid_central_unrounded_vowel.ogg",
    "schwa.ogg": "Schwa.ogg",
}


def copy_archive_audio():
    for target_name, source_name in CONSONANT_AUDIO.items():
        shutil.copyfile(ARCHIVE_DIR / source_name, TARGET_DIR / target_name)


def download_commons_audio():
    for target_name, file_name in VOWEL_AUDIO.items():
        url = "https://commons.wikimedia.org/wiki/Special:FilePath/" + file_name.replace(" ", "_")
        subprocess.run(
            [
                "curl",
                "-L",
                "-A",
                "Mozilla/5.0",
                url,
                "-o",
                str(TARGET_DIR / target_name),
            ],
            check=True,
        )


def write_attribution():
    content = """Phonics audio attribution

Local phoneme audio files in this folder are sourced from Wikimedia Commons and the
archived Wikimedia phoneme collection at https://github.com/jynbug/wikimedia-phoneme-audio.

Consonant audio files are copied from the archived collection above.
Vowel audio files are downloaded from Wikimedia Commons Special:FilePath links.

These files keep their original open licenses from Wikimedia Commons contributors.
See the original file pages for exact attribution and license details.
"""
    (TARGET_DIR / "ATTRIBUTION.txt").write_text(content, encoding="utf-8")


def main():
    TARGET_DIR.mkdir(parents=True, exist_ok=True)
    copy_archive_audio()
    download_commons_audio()
    write_attribution()
    print(f"Prepared phonics audio in {TARGET_DIR}")


if __name__ == "__main__":
    main()
