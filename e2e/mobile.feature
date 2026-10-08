Feature: A notebook on a small screen
  Scenario: Notes can be organized and the theme remembered
    Given I open a fresh notebook
    When I create a note titled "A pocket notebook" with body "Small screen, room to think."
    And I pin "A pocket notebook"
    Then "A pocket notebook" is pinned
    And the mobile notebook fits the screen
    When I choose the dark theme and reload
    Then the dark theme is remembered
    When I delete "A pocket notebook"
    Then the notebook is empty

  Scenario: Swiping a sheet respects an unsaved draft
    Given I open a fresh notebook
    When I start an unsaved note
    Then swiping the sheet cannot silently discard my draft
