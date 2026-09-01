/* ==========================================================================
   data/theory/index.js — the theory registry

   Assembles the per-module globals into the three things the rest of the
   application asks for: the ordered module list, a lookup, and the two
   queries that cross a track.

   Loaded AFTER every data/theory/<module>.js and AFTER data/index.js, which
   owns the track registry both corpora share. There is no second track list
   here: the blueprint sketches a theoryTracks[] and Phase 2 collapsed it into
   the one in data/index.js, because two registries would let the Persistence
   questions and the Persistence chapters end up different colours with
   nothing to tell the reader that was an accident.

   THE ARRAY BELOW IS IN READING ORDER, AND THAT IS ITS ONLY JOB. `order` on
   each module is the number assigned by the single pass in SPRINGDECK-PLAN
   section 5.11 and is authoritative; this array is sorted to agree with it,
   and validate-theory.js refuses a duplicate or a non-integer. The numbers
   have gaps in them during Phase 3 because tracks 5 to 8 and the section 5.9
   insertions hold their slots — a module sits at its FINAL position from the
   day it is written, so nothing is renumbered later and no prerequisite that
   has been checked once has to be checked again.
   ========================================================================== */

const theoryModules = [
    howJavaRunsModule,
    objectsAndContractsModule,
    inheritanceAndInterfacesModule,
    exceptionsAndFailureModule,
    genericsAndErasureModule,
    collectionsChoosingModule,
    hashmapInternalsModule,
    streamsAndLambdasModule,
    modernJavaModule,
    threadsAndMemoryModelModule,
    executorsAndFuturesModule,
    virtualThreadsModule,
    heapAndGcModule,
    jvmDiagnosticsModule,
    iocAndTheContainerModule,
    wiringBeansModule,
    configurationAndProfilesModule,
    aopAndProxiesModule,
    autoconfigurationModule,
    applicationLifecycleModule,
    springGenerationsModule,
    httpFoundationsModule,
    dispatcherLifecycleModule,
    restApiDesignModule,
    validationAndErrorsModule,
    serializationModule,
    asyncAndSchedulingModule,
    reactiveAndWebfluxModule,
    relationalFoundationsModule,
    sqlYouAreAskedModule,
    indexesAndPlansModule,
    transactionsAndIsolationModule,
    lockingAndDeadlocksModule,
    jdbcAndPoolingModule,
    jpaMappingModule,
    persistenceContextModule,
    fetchingAndNPlusOneModule
].sort(function (a, b) { return a.order - b.order; });

const theoryByModuleId = theoryModules.reduce(function (map, module) {
    map[module.id] = module;
    return map;
}, {});

/* The modules of one track, in reading order. Note that a track's modules are
   NOT contiguous in the global order — craft is deliberately scattered, and
   build-and-dependencies sits at 2 between two java-platform modules. Reading
   one track top to bottom is a legitimate way to use the deck; reading the
   global order is the better one, and the module card shows its number so the
   difference is visible rather than hidden. */
function modulesInTrack(trackId) {
    return theoryModules.filter(function (module) {
        return module.trackId === trackId;
    });
}

/* Every block of one type across a track, with its chapter and module
   attached. Phase 4 harvests the glossary with this (type 'definition'), and
   the Synthesis and Predict modes collect their units the same way — which is
   why neither of those modes needs a corpus of its own. A drill lives in the
   chapter that teaches what it drills, and the mode is a view over that. */
function blocksOfTypeInTrack(type, trackId) {
    var found = [];
    theoryModules.forEach(function (module) {
        if (trackId && module.trackId !== trackId) return;
        module.chapters.forEach(function (chapter) {
            chapter.blocks.forEach(function (block) {
                if (block.type === type) {
                    found.push({ block: block, chapter: chapter, module: module });
                }
            });
        });
    });
    return found;
}
