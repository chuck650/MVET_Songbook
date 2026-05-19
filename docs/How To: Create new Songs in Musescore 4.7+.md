# How To: Create new Songs in Musescore 4.7+

## Technical Limitations

Musescore is a fantastic FOSS product however it stil has several limitations that guide the workflow.

- **One instrument per mixer channel**. An instument in Musescore is ampped directly to a channel.  It cannot separate voices so voices 1-4 will all play together in the mixer.

- **Linked staves belong to one instrument**. I single instrument can have a one or more linked staves where changes to one stave are reflected in others.  A stave cannot be linked or shared between instruments, which also applies to voices on the stave.  **All** the voices onthe stave are linked to thesame voices on the linked stave.

- **Parts cannot combine staves from different instruments**. A part can have only one Instrument per stave, but can filter for parts on the stave.  E.g., you cannot create a Full Choir part with the Soprano and Alto instruments combined on a single stave and the Tenor and Bass instruments together on another stave.

- **Imploding combines instruments/voices erratically**. Imploding merges voices from different instruments onto a single instrument (The top one in the selection).  E.g. ordering Women, Soprano, and Alto, selecting all three and imploding merges the voices together, but the resulting stem directions are not the typical voice 1 all up and voice 2 all down.  They are erratically mixed and generally unuseable.

- **Dynamics assigned to all are actually voice 1**.  Any dynamic, such as a harpin that are assigned to all voices inthe properties pane are actually attached to voice 1. This affects how thay show up on parts since only when voice 1 is included will the dynamic appear on a part.

- **Parts Export Structure vs Visual Visibility (The "Eye" Icon)**. When exporting a Part to MusicXML, MuseScore 4 ignores visual visibility (the "Eye" icon) and exports the *structural definition* of the part. If a part is imported or created as a default, its structural instruments are hardcoded (indicated by the gear icon and the "Reset" behavior). Hiding an instrument with the eye icon only stops it from rendering visually in PDFs/screen; it will still be silently exported into the XML. To fix XML export issues, you must delete the corrupt part and **create a new part**—for new custom parts, your initial Eye icon toggles will correctly define the underlying XML structural assignment.

## Choral Workflow

Choral arrangments typicall have SATB instruments or Women,Men instuments with each having 2 voices.  Women voice 1 is usually Soprano, Women voice 2 is Alto; Men voice 1 is Tenor, and Men voice 2 is Bass.  Sheet music that displays this way with a single set of lyrics betweenthe staves in a grand staff is called a conductors arrangment.  This arrangement is great for printing but cannot be used to create SATB parts that can be individually exported to audio or video since the mixer cannot separate voices for playback.

This leads us to the following procedural steps and requires diligent maintenance for SATB choral arrangements that neet individual part playback.

1. Create six instrument: Soprano, Alto, Tenor, Bass, Women, Men.

2. Hide Women and Men in the Layout and create the four SATB parts on their individual instruments. Each instrument will automatically get their own part in the part manager that cannot be deleted.

3. Write the parts for each instrument on the main score using voice 1 for Soprano, Alto, Tenor and Bass, leaving voice 2 empty.

4. Create the Women's and Mens parts:
   
   1. Select all the Alto voice 1 and copy to the Women instrument then exchange voices betwen 1-2 to push the Alto part into the voice 2 slot.
   
   2. Select all the Soprano voice 1, less lyrics if appropriate, and copy to the Women instrument.
   
   3. Select all the Bass voice 1 and copy to the Men instrument then exchange voices betwen 1-2 to push the Alto part into the voice 2 slot.
   
   4. Select all the Tenor voice 1 and copy to the Men instrument.
   
   5. 

5. Create a full choir conductors score:
   
   1. Create a **new** part in the part manager named SATB. *(Do not reuse or rename an existing/imported part, as its structural XML definition will be locked).*
   
   2. In the layout (Instruments) panel, click the eye icon to show Women and Men and hide Soprano, Alto, Tenor, and Bass. This will give you two staves on a grand staff with Soprano and Alto on top and Tenor & Bass on the bottom. Because you created a clean new part, MuseScore will correctly bind this structural choice for XML exports.

6. Export sheet music and MusicXMl files for printing and display:
   
   1. Export the SATB part to pdf to create the sheet music for printing.
   
   2. Export the remaining six parts as MusicXML files for displaying subsets of the full score.

7. Export rehearsal tracks:
   
   1. Export all seven parts to MP3 audio files at 48000 Hz and 128 kBits/s.
   
   2. Export all seven parts to FLAC audio files at 48000 Hz and 24 bit sampling rate.
   
   3. Export all seven parts to MP4 video files at 48000 Hz and 128 kBits/s sample rate with 1080p video resolution reflowed to fit video resolution.

8. Repeat from Step 3 to edit any part.
