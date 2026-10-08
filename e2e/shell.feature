Feature: The app shell
  Scenario: Settings reopen without a network connection
    Given I open Talk Coach
    And the app is ready offline
    When I disconnect from the network and reopen the app
    Then I see the settings page
