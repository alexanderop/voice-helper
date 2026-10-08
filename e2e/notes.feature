Feature: Local notes
  Scenario: A saved note survives editing and reopening
    Given I open a fresh notebook
    When I create a note titled "A small beginning" with body "Build something useful."
    And I edit "A small beginning" to "A better beginning" with body "Keep it local."
    And I reload the notebook
    Then I see the note "A better beginning" with body "Keep it local."
    When I search for "missing phrase"
    Then I see no matching notes
    When I search for "better"
    Then I see the note "A better beginning" with body "Keep it local."

  Scenario: Notes reopen without a network connection
    Given I open a fresh notebook
    When I create a note titled "Offline thought" with body "Still here on the train."
    And the notebook is ready offline
    And I disconnect from the network and reopen the notebook
    Then I see the note "Offline thought" with body "Still here on the train."
    When I create a note titled "Written offline" with body "No connection needed."
    And I reload the notebook
    Then I see the note "Written offline" with body "No connection needed."

  Scenario: A new version waits for an explicit update
    Given I open a fresh notebook
    When I create a note titled "Keep this note" with body "Updates preserve local data."
    And the notebook is ready offline
    And a new version becomes available
    Then I can postpone the update
    When I accept the update
    Then the notebook runs version "2"
    And I see the note "Keep this note" with body "Updates preserve local data."

  Scenario: An update cannot discard an open draft
    Given I open a fresh notebook
    And the notebook is ready offline
    When I start an unsaved note
    And a new version becomes available
    Then the draft is preserved and the update cannot reload it

  Scenario: An update in another tab preserves my draft and navigation
    Given I open a fresh notebook
    And the notebook is ready offline
    When I start an unsaved note
    And another tab installs a new version
    Then the draft is preserved and the update cannot reload it
    When I save the preserved draft and update this tab
    Then the notebook runs version "2"
    And I see the note "Unfinished thought" with body "Do not reload this draft."

  Scenario: Browser Back restores a writable notebook
    Given I open a fresh notebook
    And the notebook is ready offline
    When I visit another page and return with browser Back
    Then the notebook was restored from the browser cache
    When I create a note titled "Back again" with body "Still able to save."
    And I reload the notebook
    Then I see the note "Back again" with body "Still able to save."
