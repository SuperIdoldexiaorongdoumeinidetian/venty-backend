using System;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // Public-facing identity
    public string Username { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public string? Bio { get; set; }
    public Uri? AvatarUrl { get; set; }

    // Contact / links (optional, platform-dependent whether shown)
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    public Uri? WebsiteUrl { get; set; }

    // Account status
    public bool IsActive { get; set; } = true;
    public bool IsVerified { get; set; } = false;

    // Localization
    public string? Locale { get; set; }          // e.g. "de-DE"
    public string? TimeZone { get; set; }        // e.g. "Europe/Berlin"

    // Timestamps
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? LastLoginAt { get; set; }
}

