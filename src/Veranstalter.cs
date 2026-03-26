using System;
using System.Collections.Generic;

public class Veranstalter
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Name { get; set; } = "";
    public string? Beschreibung { get; set; }
    public Uri? LogoUrl { get; set; }
    public Uri? BannerUrl { get; set; }

    public string? KontaktEmail { get; set; }
    public string? KontaktTelefon { get; set; }
    public Uri? WebsiteUrl { get; set; }

    public string? Adresse { get; set; }
    public string? Stadt { get; set; }
    public string? Postleitzahl { get; set; }
    public string? Land { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }

    public bool IsActive { get; set; } = true;
    public bool IsVerified { get; set; } = false;

    public decimal? Mindestbestellwert { get; set; }
    public decimal? Liefergebuehr { get; set; }
    public int? LieferzeitMinutenMin { get; set; }
    public int? LieferzeitMinutenMax { get; set; }

    public Dictionary<DayOfWeek, List<Zeitfenster>> Oeffnungszeiten { get; set; } = new();

    public HashSet<Guid> VeranstaltungIds { get; set; } = new();

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Veranstaltung PostVeranstaltung(Veranstaltung v)
    {
        if (v is null) throw new ArgumentNullException(nameof(v));
        if (!IsActive) throw new InvalidOperationException("Veranstalter ist nicht aktiv.");

        v.VeranstalterId = Id;
        v.Status = VeranstaltungStatus.Published;
        v.PublishedAt = DateTimeOffset.UtcNow;
        v.UpdatedAt = DateTimeOffset.UtcNow;

        VeranstaltungIds.Add(v.Id);
        UpdatedAt = DateTimeOffset.UtcNow;
        return v;
    }
}

public readonly record struct Zeitfenster(TimeSpan Von, TimeSpan Bis);

