# Country Inference Integration - Feature Guide

## Overview

The Country Inference Integration feature automatically detects the country from uploaded store data, making the country field optional when it can be reliably inferred. This streamlines the import process, especially for regional data files where all stores belong to the same country.

## How It Works

### Automatic Detection

When you upload a store data file, the system automatically analyzes:

1. **Filename patterns** - e.g., "germany_stores.xlsx", "uk-locations.csv"
2. **Postcode formats** - Different countries have distinct postcode patterns
3. **City and region names** - Major cities help identify countries
4. **Address patterns** - Address formatting varies by country

### Confidence Levels

The system assigns a confidence level to each detection:

- **🟢 High (80%+)** - Country field is optional, detection is very reliable
- **🟡 Medium (50-79%)** - Country field is optional, but you can override if needed
- **🔴 Low (<50%)** - Country field is required, please select manually or map a column

## Using the Feature

### Step 1: Upload Your File

Click "Upload Store Data" and select your Excel (.xlsx) or CSV file.

### Step 2: Review Country Detection

In the preview modal, you'll see the detected country with a confidence badge:

```
Country
┌─────────────────────────────────────┐
│ 🇩🇪 Germany                    ▼   │
└─────────────────────────────────────┘
🟢 High confidence · from postcodes
```

### Step 3: Override if Needed

If the detection is incorrect, simply select the correct country from the dropdown:

```
Country
┌─────────────────────────────────────┐
│ 🇫🇷 France                     ▼   │
└─────────────────────────────────────┘
✏️ Manual selection
```

### Step 4: Complete Import

Click "Import & Geocode" to proceed. The selected or inferred country will be applied to all rows.

## Detection Methods

### From Filename

**Examples:**
- `germany_stores.xlsx` → 🇩🇪 Germany
- `uk-locations.csv` → 🇬🇧 United Kingdom
- `usa_stores_2024.xlsx` → 🇺🇸 United States

**Confidence:** High (80%)

### From Postcodes

**Examples:**
- `10115, 80331, 60311` → 🇩🇪 Germany (5 digits)
- `10001, 90210, 60601` → 🇺🇸 United States (5 or 5+4 digits)
- `SW1A 1AA, M1 1AE` → 🇬🇧 United Kingdom (alphanumeric)

**Confidence:** High (80%)

### From City Names

**Examples:**
- `Berlin, Munich, Hamburg` → 🇩🇪 Germany
- `London, Manchester, Birmingham` → 🇬🇧 United Kingdom
- `Paris, Lyon, Marseille` → 🇫🇷 France

**Confidence:** Medium (60%)

### From Filename (Partial)

**Examples:**
- `stores_london.xlsx` → 🇬🇧 United Kingdom
- `paris_locations.csv` → 🇫🇷 France

**Confidence:** Medium (70%)

### Fallback

When no clear signals are found, the system defaults to Germany (most common in the dataset).

**Confidence:** Low (30%)

## Supported Countries

The system currently supports automatic detection for:

- 🇩🇪 Germany (DE)
- 🇺🇸 United States (US)
- 🇬🇧 United Kingdom (UK)
- 🇫🇷 France (FR)
- 🇨🇦 Canada (CA)
- 🇦🇺 Australia (AU)
- 🇳🇱 Netherlands (NL)
- 🇮🇹 Italy (IT)
- 🇪🇸 Spain (ES)
- 🇨🇭 Switzerland (CH)

## Best Practices

### For Best Detection Results

1. **Include postcodes** - Most reliable signal for country detection
2. **Use descriptive filenames** - Include country name or code
3. **Consistent formatting** - Use standard address formats

### When to Override

- Detection confidence is low (🔴)
- You know the data is from a different country
- Mixed-country data (map country column instead)

### When to Map Country Column

If your spreadsheet has a country column, the system will:
1. Automatically detect and suggest mapping it
2. Use column data instead of inference
3. Show high confidence (🟢) since data is explicit

## Troubleshooting

### "Country is required" Error

**Cause:** Low confidence detection and no country column mapped

**Solution:**
1. Manually select the correct country from dropdown, OR
2. Map a country column if your data has one

### Wrong Country Detected

**Cause:** Ambiguous data signals (e.g., international postcodes)

**Solution:**
1. Override by selecting correct country from dropdown
2. Your selection will be applied to all rows

### No Detection Shown

**Cause:** Modal not fully loaded or inference error

**Solution:**
1. Close and reopen the preview modal
2. Check browser console for errors
3. Contact support if issue persists

## Technical Details

### Detection Algorithm

The system uses a multi-signal approach:

1. **Filename Analysis** - Pattern matching against country names and codes
2. **Postcode Validation** - Regex patterns for each country's format
3. **Geographic Matching** - City and region name databases
4. **Confidence Scoring** - Weighted combination of all signals

### Performance

- Detection runs client-side (no API calls)
- Completes in <100ms for typical files
- No impact on import speed

### Privacy

- All detection happens in your browser
- No data sent to external services
- Filename and sample data analyzed locally

## Examples

### Example 1: German Stores with Postcodes

**File:** `germany_stores_2024.xlsx`

**Data:**
```
Name          | Address           | City    | Postcode
Store Berlin  | Hauptstr. 1       | Berlin  | 10115
Store Munich  | Marienplatz 5     | Munich  | 80331
```

**Result:** 🟢 High confidence - Germany (from filename + postcodes)

### Example 2: UK Stores without Postcodes

**File:** `uk_locations.csv`

**Data:**
```
Name            | Address        | City
Store London    | High St 123    | London
Store Manchester| King St 45     | Manchester
```

**Result:** 🟡 Medium confidence - United Kingdom (from filename + cities)

### Example 3: Ambiguous Data

**File:** `stores.xlsx`

**Data:**
```
Name     | Address      | City
Store 1  | Main St 1    | Springfield
Store 2  | Oak Ave 2    | Riverside
```

**Result:** 🔴 Low confidence - Manual selection required

## Feedback

If you encounter issues or have suggestions for improving country detection:

1. Note the filename and data patterns
2. Record the detected country and confidence
3. Contact the development team with details

## Version History

- **v1.0** (2024-01) - Initial release with 10 country support
- Detection methods: filename, postcodes, cities
- Confidence scoring system
- Manual override capability
