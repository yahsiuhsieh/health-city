# HealthCity Glossary

HealthCity turns personal health and activity records into an explorable world. It supports replay of recorded changes within a day.

## Language

**HealthCity**: The personal data world in this project. It includes the city, ocean, islands, terrain, plants, and characters under consideration in its design.

**Home world**: A personal world with stable geography and recognizable landmarks. Terrain details and daily activity reflect records for the selected date.

**Data building**: A city building or block with a consistent data role across dates. Records change its represented state.
_Avoid_: Automatically adding a building for each record, requiring one building per metric.

**Life memory**: A trace of experience accumulated through the selected date. A small number of world areas preserve these traces for later exploration.

**Exercise garden**: A monthly garden with one flower per completed recorded exercise session. Flowers appear at session end, with colors distinguishing exercise types.
Each month starts without flowers. Historical dates provide access to earlier gardens.
_Avoid_: Lifetime accumulation in one garden, automatic growth as calendar time passes.

**Replay**: A presentation of recorded changes within a day, in the original chronological order.
_Avoid_: Prediction, live monitoring.

**Day view**: The selected local calendar date and its replay interval. The interval runs from midnight to the next midnight, labeled 00:00–24:00.

**Replay time zone**: The explicit time zone for the day-view calendar and intraday clock. It defaults to the home city's zone, independently of weather-location overrides.
_Avoid_: Automatic date reassignment when the weather city changes, changes to source timestamps.

**Sleep session**: One complete recorded sleep period with its original start and end times. A session may cross midnight.
_Avoid_: Separate sessions created solely because sleep crosses midnight.

**Sleep overview**: A presentation of a complete sleep session, including its start and end dates. It is independent of the portion within the selected day view.

**Sleep island**: An island for one complete sleep session. Land area is proportional to recorded time asleep, and habitat proportions reflect stage durations.
Naps have separate islands. Awake segments do not add islands or land area.

**Sleep journey**: The chronological boat journey through the environments for a sleep session's stages. Scenes appear progressively, ending with arrival at the completed sleep island.
_Avoid_: The return voyage to the city, repeated circuits around an island.

**Wake buoy**: A marker for a recorded awake interruption within a sleep session.
_Avoid_: A separate sleep island, the session's end.

**Unclassified sleep**: Recorded time asleep without a LIGHT, DEEP, or REM classification.
_Avoid_: Light sleep, awake time, missing sleep records.

**Return voyage**: The boat's return from a completed sleep island to the city harbor during the awake interval. Timing allows the next sleep departure.
_Avoid_: Recorded sleep, actual travel, reverse playback of sleep stages.

**REM companions**: Fish, whales, rays, or sharks accompanying REM portions of a sleep journey. Species vary encounters without encoding separate health scores.
The same segment has consistent encounters on replay.

**World daylight**: Daylight at the replay instant, based on sunrise and sunset for the selected historical date and relevant location.
_Avoid_: The viewer's current clock, a daylight cycle triggered by waking.

**World location**: The historical city for a selected date's weather and daylight. It comes from the default city or a manual travel-date override.
_Avoid_: The viewer's current location, a recorded GPS route.

**Data gap**: An interval without sufficient records for a particular representation. Each data stream may have different gaps.
_Avoid_: Zero activity, rest.

**Active energy**: Estimated energy expenditure through activity above basal expenditure.
_Avoid_: Total calories burned.

**Total energy**: Estimated energy expenditure that includes basal metabolism and active energy.
_Avoid_: Activity-only energy.

**Traffic**: Road vehicles representing the mean total energy expenditure rate in the current five-minute interval. The rate includes basal metabolism and uses a shared scale across dates.
_Avoid_: Calories accumulated since midnight, activity-only energy, Cardio Load.

**Pedestrian activity**: People moving along world paths to represent recorded step volume in the current five-minute interval.
_Avoid_: Actual routes, a literal count of people, inferred exercise types.

**Heart-rate mountains**: Full-day terrain showing chronological changes in five-minute mean heart rate. Higher terrain represents higher mean heart rate.
_Avoid_: Actual elevation, a cardiovascular fitness score.

**Heart rate variability (HRV)**: Variation in the time between heartbeats. The inspected Takeout includes daily sleep-average RMSSD and finer RMSSD samples, measured in milliseconds.
_Avoid_: Heart rate, accumulated activity, an overall health score.

**HRV skyline**: Ordinary high-rises whose count represents the selected date's daily HRV summary. The count remains fixed during that day's replay.
_Avoid_: Accumulated daytime HRV, buildings earned through exercise, an overall health grade.

**RHR reservoir**: An inland reservoir behind a fixed dam. Its water level represents the selected date's daily resting heart rate and remains fixed during replay.
_Avoid_: Instantaneous heart rate, rainfall, actual water supply, an overall health grade.

**Resting heart rate (RHR)**: The selected source's daily estimate of resting heart rate, in beats per minute. It is distinct from intraday heart-rate samples.
_Avoid_: Instantaneous heart rate, an overall health or stress grade.

**Ridge train**: A mountain sightseeing train that follows the upper ridge to indicate replay time.
_Avoid_: A recorded train journey, exercise activity, energy traffic.

**Missing-data tunnel**: A railway section for an interval without heart-rate records. The train travels out of sight while replay time continues.
_Avoid_: Low heart rate, sleep, rest.

**Cardio Load**: A personalized estimate of accumulated cardiovascular effort that incorporates activity duration and heart-rate intensity.
_Avoid_: Calories, overall daily activity, a health score.
