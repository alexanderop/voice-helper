Feature: Practice without the speech model
  Scenario: First launch offers the one-time setup
    Given I open Talk Coach for the first time
    Then I see the speech model setup
    And the app does not claim to be offline ready
    When I go to Today
    Then practice waits for the speech model
    And the page fits the phone screen

  Scenario: Imported captions are counted and kept
    Given I open Talk Coach for the first time
    When I import the caption file "vue-talk.vtt"
    Then the result shows 2 yeah, 1 um or uh, and 2 hedges
    And the transcript marks "um" as a filler and "maybe" as a hedge
    When I reload the app on Progress
    Then "vue-talk.vtt" is listed with 3 fillers per minute

  Scenario: Deleting all data empties Progress
    Given I open Talk Coach for the first time
    When I import the caption file "vue-talk.vtt"
    And I delete all data in Settings
    Then Progress lists no imported talks

  Scenario: The theme is remembered
    Given I open Talk Coach for the first time
    When I choose the dark theme and reload
    Then the dark theme is still selected
