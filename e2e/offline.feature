Feature: Offline shell
  Scenario: Saved results reopen without a network connection
    Given I open Talk Coach for the first time
    When I import the caption file "vue-talk.vtt"
    And the app is ready offline
    And I disconnect from the network and reopen Progress
    Then "vue-talk.vtt" is listed with 3 fillers per minute
    When I open the imported talk
    Then the result shows 2 yeah, 1 um or uh, and 2 hedges
