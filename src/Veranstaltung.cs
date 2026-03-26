using System;
using System.Collections.Generic;

public enum VeranstaltungStatus
{
    Draft = 0,
    Published = 1,
    Cancelled = 2
}

public class Veranstaltung
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid VeranstalterId { get; set; }

    public string Titel { get; set; } = "";
    public string? Beschreibung { get; set; }

    public string? OrtName { get; set; }
    public string? Adresse { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }

    public DateTimeOffset StartetAm { get; set; }
    public DateTimeOffset EndetAm { get; set; }

    public int? MaxTeilnehmer { get; set; }
    public HashSet<Guid> TeilnehmerIds { get; set; } = new();

    public VeranstaltungStatus Status { get; set; } = VeranstaltungStatus.Draft;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? PublishedAt { get; set; }
    public DateTimeOffset? CancelledAt { get; set; }

    public bool CanAcceptMoreTeilnehmer()
        => MaxTeilnehmer is null || TeilnehmerIds.Count < MaxTeilnehmer.Value;
}

